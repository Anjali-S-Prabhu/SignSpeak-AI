from roboflow import Roboflow

# Initialize the Roboflow workspace client
rf = Roboflow(api_key="YOUR_ROBOFLOW_API_KEY")

# Reference the exact workspace model shown on your screen
project = rf.workspace().project("sign-language-c8yo2")
version = project.version(2)

# Download and extract train, test, and valid folders seamlessly
print("Starting dataset download and extraction...")
dataset = version.download("yolov8")
print("Done! Check your folder structure now.")
