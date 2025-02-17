"""
@Purpose: Handles project-wide parameters
@Usage: Functions called by the main process
"""

import argparse
import os
import sys
import socket
from sources.common.common import processControl
from sources.common.utils import configLoader, dbTimestamp

# Constants for parameter files
JSON_PARMS = "config.json"

def manageArgs():
    """
    @Desc: Parse command-line arguments to configure the process.
    @Result: Returns parsed arguments as a Namespace object.
    """
    parser = argparse.ArgumentParser(description="Main process for APK Static Analyzer.")
    parser.add_argument('--proc', type=str, help="Process type: FULL", default="FULL")
    parser.add_argument('--source', type=str, help="APK Source path", default="")
    parser.add_argument('--result', type=str, help="Results path", default="")
    return parser.parse_args()


def manageSettings():
    config = configLoader()
    settingsData = config.get_settings()
    def_data = {}
    for key, value in settingsData.items():
        def_data[key] = value

    def_data["timestamp"] = dbTimestamp()
    return def_data


def manageEnv():
    """
    @Desc: Defines environment paths and variables.
    @Result: Returns a dictionary containing environment paths.
    """
    config = configLoader()
    environment = config.get_environment()

    env_data = {}
    for key, value in environment.items():
        if "realPath" in key:
            env_data[key] = value
        else:
            env_data[key] = os.path.join(environment["realPath"], value)

    os.makedirs(env_data['.pycache'], exist_ok=True)
    os.environ['PYTHONPYCACHEPREFIX'] = env_data['.pycache']
    sys.pycache_prefix = env_data['.pycache']
    env_data['systemName'] = socket.getfqdn()

    storage = config.get_storage()
    storageFull = {}

    for key, value in storage.items():
        if "nfs" in key:
            storageFull[key] = value
        else:
            storageFull[key] = os.path.join(storage["nfs"], value)
    env_data['storage'] = storageFull

    mongo = config.get_mongo()
    env_data['mongo'] = mongo

    return env_data


def manageData():
    data = {}
    return data


def getConfigs():
    processControl.env = manageEnv()
    processControl.settings = manageSettings()
    processControl.args = manageArgs()
    processControl.data = manageData()
