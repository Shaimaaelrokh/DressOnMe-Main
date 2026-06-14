import os
import uuid

def get_file_path(instance, filename, folder_name):
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join(folder_name, filename)

def avatar_path(instance, filename):
    return get_file_path(instance, filename, 'avatars')

def product_main_path(instance, filename):
    return get_file_path(instance, filename, 'products')

def product_secondary_path(instance, filename):
    return get_file_path(instance, filename, 'products/secondary')

def tryon_user_path(instance, filename):
    return get_file_path(instance, filename, 'tryons/user_images')

def tryon_result_path(instance, filename):
    return get_file_path(instance, filename, 'tryons/results')

def national_id_path(instance, filename):
    return get_file_path(instance, filename, 'identity/ids')

def brand_path(instance, filename):
    return get_file_path(instance, filename, 'brands')
