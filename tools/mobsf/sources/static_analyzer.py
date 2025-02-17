# -*- coding: utf_8 -*-
"""Android Static Code Analysis."""
from sources.common.common import logger, processControl, log_

from sources.common.utils import getChecksum
from sources.apk import apk_analysis
import os
import json

def static_analyzer(request, checksum="", api=False):
    """
    Perform static analysis on an application and save the results to the database.

    This function analyzes an APK file based on its checksum or filename. If no checksum is provided,
    it calculates it from the specified file path. The function then sets up the analysis environment,
    logs the process, and calls the `apk_analysis` function.

    :param request: The filename of the APK to be analyzed.
    :type request: str
    :param checksum: The MD5 checksum of the APK file. If not provided, it will be computed.
    :type checksum: str, optional
    :param api: Flag to indicate whether the analysis is performed via an API request.
    :type api: bool, optional

    :return: The checksum of the analyzed APK file.
    :rtype: str

    :raises Exception: If an error occurs during the static analysis process.
    """

    """ 
    el fichero APK lo captura de robj = RecentScansDB.objects.filter(MD5=checksum)
    en request estoy pasando el fileName
    """
    filename = request
    rescan = False

    try:
        if not checksum:
            checksum = getChecksum(processControl.data['process']['filePath'])

        fileProcessPath = f"{checksum}.apk"
        if os.path.exists(fileProcessPath):
            os.remove(fileProcessPath)

        app_dic = {}

        app_dic['dir'] = processControl.env['inputPath']  # BASE DIR
        app_dic['app_name'] = filename  # APP ORIGINAL NAME
        app_dic['md5'] = checksum  # MD5  EGA pending: validacion is_md5(checksum)
        app_dic['app_dir'] = processControl.env['outputPath']
        app_dic['tools_dir'] = processControl.env['tools']
        app_dic['icon_path'] = ''
        log_("info", logger, f'Scan Hash: {checksum}')
        log_("info", logger, f"start analysis {app_dic['app_name']}")
        processControl.data['app_dic'] = app_dic
        context = apk_analysis(request, app_dic, rescan, api)

        if processControl.args.result:
            if "apkId" in context:
                del context["apkId"]
            jsonResultsPath = os.path.join(processControl.args.result, f"{filename}.json")
            with open(jsonResultsPath, "w", encoding="utf-8") as f:
                json.dump(context, f, indent=4)

            log_("info", logger, f"Archivo JSON guardado correctamente. {jsonResultsPath}")

        fileSourcePath = os.path.join(processControl.env['inputPath'], filename)
        os.remove(fileSourcePath)
        filePath = os.path.join(processControl.env['inputPath'], fileProcessPath)
        os.remove(filePath)

        return checksum

    except Exception as exp:
        log_("exception", logger, f'Error: {exp}')
        pass
