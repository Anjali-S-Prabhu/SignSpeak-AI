from roboflow import Roboflow
rf = Roboflow(api_key='YOUR_API_KEY')
project = rf.workspace().project('sign-language-c8yo2')
version = project.version(2)
dataset = version.download('yolov8')