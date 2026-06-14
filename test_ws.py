import asyncio
import websockets
import sys

async def test_ws():
    uri = "ws://localhost:8000/ws/chat/2/"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            await websocket.send('{"message": "hello"}')
            response = await websocket.recv()
            print("Received:", response)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_ws())
