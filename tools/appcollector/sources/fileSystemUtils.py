import os


def checkFolder(folderPath):
    """
    Ensures that the specified folder exists. If the folder does not exist, it is created.

    This function utilizes `os.makedirs` with `exist_ok=True` to create the directory at the given
    path. If the directory already exists, no exception is raised, and the function completes
    silently.

    :param folderPath: The path of the folder to check or create.
                       This can be an absolute or relative path.
    :type folderPath: str
    :return: None
    :raises OSError: If the directory cannot be created due to permission issues or invalid path.
    """
    os.makedirs(folderPath, exist_ok=True)
