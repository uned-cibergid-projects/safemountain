# -*- coding: utf_8 -*-
from sources.common.common import logger, log_, processControl

from sources.mongoManager import storeAnalisys
"""
import logging

from django.conf import settings
from django.db.models import QuerySet

from mobsf.MobSF.utils import (
    append_scan_status,
    get_scan_logs,
    python_dict,
    python_list,
)
from mobsf.MobSF.views.home import update_scan_timestamp
from mobsf.StaticAnalyzer.models import StaticAnalyzerAndroid
from mobsf.StaticAnalyzer.models import RecentScansDB
from mobsf.StaticAnalyzer.views.common.suppression import (
    process_suppression,
    process_suppression_manifest,
)

#Module holding the functions for the db.


logger = logging.getLogger(__name__)
"""


"""
def get_context_from_db_entry(db_entry: QuerySet) -> dict:
    #Return the context for APK/ZIP from DB.
    try:
        msg = 'Analysis is already Done. Fetching data from the DB...'
        logger.info(msg)
        package = db_entry[0].PACKAGE_NAME
        code = process_suppression(
            python_dict(db_entry[0].CODE_ANALYSIS),
            package)
        manifest_analysis = process_suppression_manifest(
            python_list(db_entry[0].MANIFEST_ANALYSIS),
            package)
        context = {
            'version': settings.MOBSF_VER,
            'title': 'Static Analysis',
            'file_name': db_entry[0].FILE_NAME,
            'app_name': db_entry[0].APP_NAME,
            'app_type': db_entry[0].APP_TYPE,
            'size': db_entry[0].SIZE,
            'md5': db_entry[0].MD5,
            'sha1': db_entry[0].SHA1,
            'sha256': db_entry[0].SHA256,
            'package_name': package,
            'main_activity': db_entry[0].MAIN_ACTIVITY,
            'exported_activities': db_entry[0].EXPORTED_ACTIVITIES,
            'browsable_activities': python_dict(
                db_entry[0].BROWSABLE_ACTIVITIES),
            'activities': python_list(db_entry[0].ACTIVITIES),
            'receivers': python_list(db_entry[0].RECEIVERS),
            'providers': python_list(db_entry[0].PROVIDERS),
            'services': python_list(db_entry[0].SERVICES),
            'libraries': python_list(db_entry[0].LIBRARIES),
            'target_sdk': db_entry[0].TARGET_SDK,
            'max_sdk': db_entry[0].MAX_SDK,
            'min_sdk': db_entry[0].MIN_SDK,
            'version_name': db_entry[0].VERSION_NAME,
            'version_code': db_entry[0].VERSION_CODE,
            'icon_path': db_entry[0].ICON_PATH,
            'permissions': python_dict(db_entry[0].PERMISSIONS),
            'malware_permissions': python_dict(
                db_entry[0].MALWARE_PERMISSIONS),
            'certificate_analysis': python_dict(
                db_entry[0].CERTIFICATE_ANALYSIS),
            'manifest_analysis': manifest_analysis,
            'network_security': python_dict(db_entry[0].NETWORK_SECURITY),
            'binary_analysis': python_list(db_entry[0].BINARY_ANALYSIS),
            'file_analysis': python_list(db_entry[0].FILE_ANALYSIS),
            'android_api': python_dict(db_entry[0].ANDROID_API),
            'code_analysis': code,
            'niap_analysis': python_dict(db_entry[0].NIAP_ANALYSIS),
            'permission_mapping': python_dict(db_entry[0].PERMISSION_MAPPING),
            'urls': python_list(db_entry[0].URLS),
            'domains': python_dict(db_entry[0].DOMAINS),
            'emails': python_list(db_entry[0].EMAILS),
            'strings': python_dict(db_entry[0].STRINGS),
            'firebase_urls': python_list(db_entry[0].FIREBASE_URLS),
            'files': python_list(db_entry[0].FILES),
            'exported_count': python_dict(db_entry[0].EXPORTED_COUNT),
            'apkid': python_dict(db_entry[0].APKID),
            'behaviour': python_dict(db_entry[0].QUARK),
            'trackers': python_dict(db_entry[0].TRACKERS),
            'playstore_details': python_dict(db_entry[0].PLAYSTORE_DETAILS),
            'secrets': python_list(db_entry[0].SECRETS),
            'logs': get_scan_logs(db_entry[0].MD5),
            'sbom': python_dict(db_entry[0].SBOM),
        }
        return context
    except Exception:
        msg = 'Fetching data from the DB failed.'
        logger.exception(msg)


def get_context_from_analysis(app_dic,
                              man_data_dic,
                              man_an_dic,
                              code_an_dic,
                              cert_dic,
                              bin_anal,
                              apk_id,
                              trackers) -> dict:
    #Get the context for APK/ZIP from analysis results.
    try:
        package = man_data_dic['packagename']
        code = process_suppression(
            code_an_dic['findings'],
            package)
        manifest_analysis = process_suppression_manifest(
            man_an_dic['manifest_anal'],
            package)
        context = {
            'title': 'Static Analysis',
            'version': settings.MOBSF_VER,
            'file_name': app_dic['app_name'],
            'app_name': app_dic['real_name'],
            'app_type': app_dic['zipped'],
            'size': app_dic['size'],
            'md5': app_dic['md5'],
            'sha1': app_dic['sha1'],
            'sha256': app_dic['sha256'],
            'package_name': package,
            'main_activity': man_data_dic['mainactivity'],
            'exported_activities': man_an_dic['exported_act'],
            'browsable_activities': man_an_dic['browsable_activities'],
            'activities': man_data_dic['activities'],
            'receivers': man_data_dic['receivers'],
            'providers': man_data_dic['providers'],
            'services': man_data_dic['services'],
            'libraries': man_data_dic['libraries'],
            'target_sdk': man_data_dic['target_sdk'],
            'max_sdk': man_data_dic['max_sdk'],
            'min_sdk': man_data_dic['min_sdk'],
            'version_name': man_data_dic['androvername'],
            'version_code': man_data_dic['androver'],
            'icon_path': app_dic['icon_path'],
            'certificate_analysis': cert_dic,
            'permissions': man_an_dic['permissions'],
            'malware_permissions': man_an_dic['malware_permissions'],
            'manifest_analysis': manifest_analysis,
            'network_security': man_an_dic['network_security'],
            'binary_analysis': bin_anal,
            'file_analysis': app_dic['file_analysis'],
            'android_api': code_an_dic['api'],
            'code_analysis': code,
            'niap_analysis': code_an_dic['niap'],
            'permission_mapping': code_an_dic['perm_mappings'],
            'urls': code_an_dic['urls'],
            'domains': code_an_dic['domains'],
            'emails': code_an_dic['emails'],
            'strings': code_an_dic['strings'],
            'firebase_urls': code_an_dic['firebase'],
            'files': app_dic['files'],
            'exported_count': man_an_dic['exported_cnt'],
            'apkid': apk_id,
            'behaviour': code_an_dic['behaviour'],
            'trackers': trackers,
            'playstore_details': app_dic['playstore'],
            'secrets': code_an_dic['secrets'],
            'logs': get_scan_logs(app_dic['md5']),
            'sbom': code_an_dic['sbom'],
        }
        return context
    except Exception as exp:
        msg = 'Rendering to Template failed.'
        logger.exception(msg)
        append_scan_status(app_dic['md5'], msg, repr(exp))

"""
def save_or_update(update_type,
                   app_dic,
                   man_data_dic,
                   man_an_dic,
                   code_an_dic,
                   cert_dic,
                   bin_anal,
                   apk_id,
                   trackers) -> None:
    #Save/Update an APK/ZIP DB entry.
    try:
        values = {
            'file_name': app_dic['app_name'],
            'app_name': app_dic['real_name'],
            'app_type': app_dic['zipped'],
            'size': app_dic['size'],
            'md5': app_dic['md5'],
            'sha1': app_dic['sha1'],
            'sha256': app_dic['sha256'],
            'package_name': man_data_dic['packagename'],
            'main_activity': man_data_dic['mainactivity'],
            'exported_activities': man_an_dic['exported_act'],
            'browsable_activities': man_an_dic['browsable_activities'],
            'activities': man_data_dic['activities'],
            'receivers': man_data_dic['receivers'],
            'providers': man_data_dic['providers'],
            'services': man_data_dic['services'],
            'libraries': man_data_dic['libraries'],
            'target_sdk': man_data_dic['target_sdk'],
            'max_sdk': man_data_dic['max_sdk'],
            'min_sdk': man_data_dic['min_sdk'],
            'version_name': man_data_dic['androvername'],
            'version_code': man_data_dic['androver'],
            'icon_path': app_dic['icon_path'],
            'certificate_analysis': cert_dic,
            'permissions': man_an_dic['permissions'],
            'malware_permissions': man_an_dic['malware_permissions'],
            'manifest_analysis': man_an_dic['manifest_anal'],
            'binary_analysis': bin_anal,
            'file_analysis': app_dic['file_analysis'],
            'android_api': code_an_dic['api'],
            'code_analysis': code_an_dic['findings'],
            'niap_analysis': code_an_dic['niap'],
            'permission_mapping': code_an_dic['perm_mappings'],
            'urls': code_an_dic['urls'],
            'domains': code_an_dic['domains'],
            'emails': code_an_dic['emails'],
            'strings': code_an_dic['strings'],
            'firebase_urls': code_an_dic['firebase'],
            'files': app_dic['files'],
            'exported_count': man_an_dic['exported_cnt'],
            'apkid': apk_id,
            'quark': code_an_dic['behaviour'],
            'trackers': trackers,
            'playstore_details': app_dic['playstore'],
            'network_security': man_an_dic['network_security'],
            'secrets': code_an_dic['secrets'],
            'sbom': code_an_dic['sbom'],

        }
        if not processControl.args.result:
            result = storeAnalisys(values)

        """
        if update_type == 'save':
            db_entry = StaticAnalyzerAndroid.objects.filter(
                MD5=app_dic['md5'])
            if not db_entry.exists():
                StaticAnalyzerAndroid.objects.create(**values)
        else:
            StaticAnalyzerAndroid.objects.filter(
                MD5=app_dic['md5']).update(**values)        
        """

    except Exception as exp:
        msg = f'Failed to Save/Update Database {exp}'
        #logger.exception(msg)
        #append_scan_status(app_dic['md5'], msg, repr(exp))
        raise Exception(msg)

    log_("info", logger, "Object db build")
    return values
    """
    try:
        values = {
            'APP_NAME': app_dic['real_name'],
            'PACKAGE_NAME': man_data_dic['packagename'],
            'VERSION_NAME': man_data_dic['androvername'],
        }
        RecentScansDB.objects.filter(
            MD5=app_dic['md5']).update(**values)
    except Exception as exp:
        msg = 'Updating RecentScansDB table failed'
        #logger.exception(msg)
        #append_scan_status(app_dic['md5'], msg, repr(exp))
        log_("exception", logger, msg)    
    """



def save_get_ctx(app, man, m_anal, code, cert, elf, apkid, trk, rscn):

    """
    # SAVE TO DB
    if rscn:
        msg = 'Updating Database...'
        logger.info(msg)
        append_scan_status(app['md5'], msg)
        action = 'update'
        update_scan_timestamp(app['md5'])
    else:
        msg = 'Saving to Database'
        logger.info(msg)
        append_scan_status(app['md5'], msg)
        action = 'save'
    """
    action = 'save'
    context = save_or_update(
        action,
        app,
        man,
        m_anal,
        code,
        cert,
        elf,
        apkid,
        trk,
    )
    return context

    """
    return get_context_from_analysis(
        app,
        man,
        m_anal,
        code,
        cert,
        elf,
        apkid,
        trk,
    )
    """

