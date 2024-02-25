import boto3
import os
import subprocess
import mimetypes
import zipfile
import logging

# Environment variables
TMP_SOURCE_DIR = '/tmp/hugo_source'
TMP_BUILD_DIR = '/tmp/hugo_build'
SOURCE_BUCKET = os.environ['source_bucket']
DESTINATION_BUCKET = os.environ['destination_bucket']
if os.environ['local_stack'] == "true": # In case of LocalStack deployment
    os.environ['AWS_ACCESS_KEY_ID'] = 'test'
    os.environ['AWS_SECRET_ACCESS_KEY'] = 'test'
    os.environ['AWS_DEFAULT_REGION'] = 'eu-north-1'
    boto3.setup_default_session()
    s3 = boto3.resource('s3', region_name='eu-north-1', endpoint_url='http://host.docker.internal:4566')
else:
    s3 = boto3.resource('s3', region_name='eu-north-1')

logger = logging.getLogger()
logger.setLevel("INFO")

# Download web source files
def download_web_source(bucket_name, local_dir, mode):
    logger.info('Download step - source code from S3: {0}'.format(bucket_name))
    if not os.path.exists(local_dir):
        os.makedirs(local_dir)
    bucket = s3.Bucket(bucket_name)
    if mode == "zip":
        bucket.download_file('web.zip', os.path.join('/tmp','web.zip'))
        with zipfile.ZipFile(os.path.join('/tmp','web.zip'),"r") as zip_ref:
            zip_ref.extractall(local_dir)
    else:
        for obj in bucket.objects.all():
            target = os.path.join(local_dir,obj.key)
            if not os.path.exists(os.path.dirname(target)):
                os.makedirs(os.path.dirname(target))
            if obj.key[-1] == '/':
                continue
            bucket.download_file(obj.key,target)
    logger.info(os.listdir(local_dir))

# Build a hugo website - static website
def build_hugo(source_dir, destination_dir):
    logger.info("Build step - hugo")
    if not os.path.exists(destination_dir):
        os.makedirs(destination_dir)
    try:
        logger.info("Hugo build command start")
        result = subprocess.run(["./hugo", "-s", source_dir, "-d", destination_dir], stdout=subprocess.PIPE)
        logger.info("Hugo output:\n---\n{0}\n---".format(result.stdout.decode('UTF-8')))
    except Exception as e:
        logger.error("Exception: {0}".format(e))
        raise e
    logger.info(os.listdir(destination_dir))

# Upload web files to destination bucket
def upload_web_destination(bucket_name, local_dir, mode):
    logger.info('Uploading step - hugo site to S3: {0}'.format(bucket_name))
    bucket = s3.Bucket(bucket_name)
    if mode == "clean":
        bucket.objects.delete()
    for root,dirs,files in os.walk(local_dir):
        for file in files:
            bucket.upload_file(os.path.join(root,file),os.path.join(root,file).replace(local_dir+'/',''),
            ExtraArgs={'ContentType': mimetypes.guess_type(file)[0]})
    logger.info('Finished upload to S3: {0}'.format(bucket_name))

def lambda_handler(event, context):
    download_web_source(SOURCE_BUCKET, TMP_SOURCE_DIR, os.environ['download_mode'])
    build_hugo(TMP_SOURCE_DIR, TMP_BUILD_DIR)
    upload_web_destination(DESTINATION_BUCKET, TMP_BUILD_DIR, os.environ['upload_mode'])

    return {"statusCode": 200, \
        "headers": {"Content-Type": "text/html"}, \
        "body": "Lambda complete"}