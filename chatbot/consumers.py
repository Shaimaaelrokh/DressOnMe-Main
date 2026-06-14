import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from urllib.parse import parse_qs
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from .models import Conversation, Message
from .services import get_bot_response

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        
        # Authenticate user from query string token (JWT)
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token_list = query_params.get('token', [])
        
        if token_list:
            token = token_list[0]
            user = await self.get_user_from_token(token)
            if user:
                self.scope['user'] = user
                print(f" WebSocket Authenticated user: {user.email}")
        
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        print(f" WebSocket Connected to conversation {self.conversation_id}")
        
        # Send history and list of conversations on connect
        history = await self.get_conversation_history()
        await self.send(text_data=json.dumps({
            'type': 'history',
            'messages': history
        }))
        
        conversations = await self.get_user_conversations()
        await self.send(text_data=json.dumps({
            'type': 'conversations_list',
            'conversations': conversations
        }))
    
    async def disconnect(self, close_code):
        print(f" WebSocket Disconnected: {close_code}")
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
    
    async def receive(self, text_data):
        print(f" Received message: {text_data}")
        
        try:
            text_data_json = json.loads(text_data)
            
            # Check for request_history type
            if text_data_json.get('type') == 'request_history':
                history = await self.get_conversation_history()
                await self.send(text_data=json.dumps({
                    'type': 'history',
                    'messages': history
                }))
                return

            # Check for create_conversation type
            if text_data_json.get('type') == 'create_conversation':
                new_conv = await self.create_new_conversation()
                await self.send(text_data=json.dumps({
                    'type': 'conversation_created',
                    'id': new_conv.id
                }))
                return

            # Check for delete_conversation type
            if text_data_json.get('type') == 'delete_conversation':
                conv_id = text_data_json.get('id')
                if conv_id:
                    await self.delete_conversation(conv_id)
                    # Send updated list of conversations
                    conversations = await self.get_user_conversations()
                    await self.send(text_data=json.dumps({
                        'type': 'conversations_list',
                        'conversations': conversations
                    }))
                return

            user_message = text_data_json.get('message', '')
            user_image = text_data_json.get('image', None)
            
            user_data = {"text": user_message}
            if user_image:
                user_data["image"] = user_image
            
            await self.save_message('user', json.dumps(user_data, ensure_ascii=False))
            
            # Send updated list of conversations
            conversations = await self.get_user_conversations()
            await self.send(text_data=json.dumps({
                'type': 'conversations_list',
                'conversations': conversations
            }))

            history = await self.get_conversation_history()
            
            # get_bot_response now returns a JSON string
            user_obj = self.scope.get('user')
            if user_obj and not user_obj.is_authenticated:
                user_obj = None
            bot_reply_json = await sync_to_async(get_bot_response)(history, user_message, user_image, user_obj)
            
            # Parse the JSON response
            try:
                bot_data = json.loads(bot_reply_json)
                bot_text = bot_data.get("text", "")
                bot_products = bot_data.get("products", [])
            except (json.JSONDecodeError, TypeError):
                bot_text = str(bot_reply_json)
                bot_products = []
            
            # Save the text and products as JSON to DB
            bot_save_data = {"text": bot_text}
            if bot_products:
                bot_save_data["products"] = bot_products
            await self.save_message('assistant', json.dumps(bot_save_data, ensure_ascii=False))
            
            # Send structured response to frontend
            await self.send(text_data=json.dumps({
                'role': 'assistant',
                'message': bot_text,
                'products': bot_products
            }, ensure_ascii=False))
            print(f" Sent reply with {len(bot_products)} products")
            
        except Exception as e:
            print(f" Error in receive: {e}")
            import traceback
            traceback.print_exc()
            await self.send(text_data=json.dumps({
                'role': 'assistant',
                'message': f"عذراً، حدث خطأ: {str(e)}",
                'products': []
            }))
    
    @database_sync_to_async
    def get_user_from_token(self, token_string):
        try:
            access_token = AccessToken(token_string)
            user_id = access_token['user_id']
            User = get_user_model()
            return User.objects.get(id=user_id)
        except Exception as e:
            print(f"[WS AUTH ERROR] {e}")
            return None

    @database_sync_to_async
    def get_conversation_history(self):
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            history = []
            for msg in conversation.messages.all():
                try:
                    data = json.loads(msg.content)
                    if isinstance(data, dict):
                        history.append({
                            'role': msg.role,
                            'content': data.get('text', ''),
                            'image': data.get('image', None),
                            'products': data.get('products', [])
                        })
                    else:
                        history.append({'role': msg.role, 'content': msg.content, 'image': None, 'products': []})
                except (json.JSONDecodeError, TypeError):
                    history.append({'role': msg.role, 'content': msg.content, 'image': None, 'products': []})
            return history
        except Conversation.DoesNotExist:
            return []
    
    @database_sync_to_async
    def get_user_conversations(self):
        user = self.scope['user']
        if user.is_authenticated:
            conversations = Conversation.objects.filter(user=user).order_by('-updated_at')
            result = []
            for c in conversations:
                first_msg = c.messages.filter(role='user').first()
                if first_msg:
                    try:
                        data = json.loads(first_msg.content)
                        title_text = data.get('text', '') if isinstance(data, dict) else str(first_msg.content)
                    except (json.JSONDecodeError, TypeError):
                        title_text = str(first_msg.content)
                    title = (title_text[:25] + "...") if title_text else f"Chat {c.id}"
                else:
                    title = f"Chat {c.id}"
                result.append({'id': c.id, 'title': title})
            return result
        return []
 
    @database_sync_to_async
    def create_new_conversation(self):
        user = self.scope['user']
        conv = Conversation.objects.create(user=user if user.is_authenticated else None)
        return conv
 
    @database_sync_to_async
    def save_message(self, role, content):
        conversation, created = Conversation.objects.get_or_create(id=self.conversation_id)
        if created and self.scope['user'].is_authenticated:
            conversation.user = self.scope['user']
            conversation.save()
        Message.objects.create(
            conversation=conversation,
            role=role,
            content=content
        )
        
    @database_sync_to_async
    def delete_conversation(self, conv_id):
        user = self.scope['user']
        if user.is_authenticated:
            try:
                Conversation.objects.get(id=conv_id, user=user).delete()
            except Conversation.DoesNotExist:
                pass