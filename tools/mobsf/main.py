"""
@Purpose: Main script for initializing Android App Static Analyzer
@Usage: Run `python mainProcess.py`.
@Output: json and Mongo Database record saved.
"""
import os
import shutil
import json
import sys

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.append(BASE_DIR)

from sources.common.common import logger, processControl, log_
from sources.common.paramsManager import getConfigs
from sources.static_analyzer import static_analyzer
from sources.views.appsec import appsec_dashboard
from sources.mongoManager import storeBoard


def mainProcess():
    try:
        if processControl.args.source:
            src = processControl.args.source
            dst = processControl.env['inputPath']
            shutil.copy(src, dst)

        directory = processControl.env['inputPath']
        for filename in os.listdir(directory):
            processControl.data['process'] = {}
            processControl.data['process']['filename'] = filename
            processControl.data['process']['filePath'] = os.path.join(directory, filename)
            checksum = static_analyzer(filename)

            request = {}
            if not processControl.args.result:
                context = appsec_dashboard(request, checksum, api=False)
                if processControl.args.result:
                    jsonResultsPath = os.path.join(processControl.args.result, f"scoreBoard_{filename}.json")
                    with open(jsonResultsPath, "w", encoding="utf-8") as f:
                        json.dump(context, f, indent=4)

                    log_("info", logger, f"Archivo JSON ScoreBoard guardado en: {jsonResultsPath}")
                else:
                      #dado que no se actualiza Mongo, esto hay que cambiarlo
                    result = storeBoard(context)

    except Exception as e:
        log_("exception", logger, e)

    return True


if __name__ == '__main__':
    log_("info", logger, "********** STARTING Main Static Process **********")
    getConfigs()
    mainProcess()

    log_("info", logger, "********** PROCESS COMPLETED **********")
