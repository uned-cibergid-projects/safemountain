# -*- coding: utf_8 -*-
"""SAST engine."""
from sources.common.common import logger, processControl, log_
from sources.common.utils import run_with_timeout
#import logging

from libsast import Scanner
from libsast.core_matcher.pattern_matcher import PatternMatcher
from libsast.core_matcher.choice_matcher import ChoiceMatcher
from libsast.common import get_worker_count

"""
from django.conf import settings

from mobsf.MobSF.utils import (
    run_with_timeout,
)

logger = logging.getLogger(__name__)
"""



def get_multiprocessing_strategy():
    """Get the multiprocessing strategy."""
    # ini elimino las opciones
    """
    if settings.MULTIPROCESSING:
        # Settings take precedence
        mp = settings.MULTIPROCESSING
    elif platform.system() == 'Windows' and settings.ASYNC_ANALYSIS:
        # Set to thread on Windows for async analysis
        mp = 'thread'
    elif settings.ASYNC_ANALYSIS:
        # Set to billiard for async analysis
        mp = 'billiard'
    else:
        # Defaults to processpoolexecutor for sync analysis
        mp = 'default'
    return mp    
    """
    return 'default'


class SastEngine:
    def __init__(self, options, path):
        self.root = path
        mp = get_multiprocessing_strategy()
        cpu_core = get_worker_count()
        options['cpu_core'] = cpu_core
        options['multiprocessing'] = mp
        options['show_progress'] = False
        if mp != 'default':
            #logger.debug(
            #    'Multiprocessing strategy set to %s with (%d) CPU cores', mp, cpu_core)
            log_("info", logger, f'Multiprocessing strategy set to {mp} with {cpu_core} CPU cores')
        self.scan_paths = Scanner(options, [path]).get_scan_files()
        self.pattern_matcher = PatternMatcher(options)
        self.user = None


    def scan(self):
        """Scan the files with given rules."""
        finds = run_with_timeout(
            self.pattern_matcher.scan,
            #settings.SAST_TIMEOUT,
            5,
            self.scan_paths)
        return self.format_findings(finds)

    def read_files(self):
        """Read the files."""
        #logger.info('Reading file contents for SAST')
        log_("info", logger, f'Reading file contents for SAST')
        return self.pattern_matcher.read_file_contents(self.scan_paths)

    def run_rules(self, file_contents, rule_path):
        """Run the rules."""
        finds = run_with_timeout(
            self.pattern_matcher.regex_scan,
            #settings.SAST_TIMEOUT,
            processControl.settings['SAST_TIMEOUT'],
            file_contents,
            rule_path)
        a = self.format_findings(finds)
        return a

    def format_findings(self, findings):
        """Format the findings."""
        for details in findings.values():
            tmp_dict = {}
            for file_meta in details['files']:
                file_meta['file_path'] = file_meta[
                    'file_path'].replace(self.root, '', 1)
                file_path = file_meta['file_path']
                start = file_meta['match_lines'][0]
                end = file_meta['match_lines'][1]
                if start == end:
                    match_lines = start
                else:
                    exp_lines = []
                    for i in range(start, end + 1):
                        exp_lines.append(i)
                    match_lines = ','.join(str(m) for m in exp_lines)
                if file_path not in tmp_dict:
                    tmp_dict[file_path] = str(match_lines)
                elif tmp_dict[file_path].endswith(','):
                    tmp_dict[file_path] += str(match_lines)
                else:
                    tmp_dict[file_path] += ',' + str(match_lines)
            details['files'] = tmp_dict
        return findings


class ChoiceEngine:
    def __init__(self, options, path):
        self.root = path
        options['cpu_core'] = get_worker_count()
        options['multiprocessing'] = get_multiprocessing_strategy()
        self.scan_paths = Scanner(options, [path]).get_scan_files()
        self.choice_matcher = ChoiceMatcher(options)

    def read_files(self):
        """Read the files."""
        logger.info('Reading file contents for NIAP Scan')
        return self.choice_matcher.read_file_contents(self.scan_paths)

    def run_rules(self, file_contents, rule_path):
        """Run the rules."""
        return run_with_timeout(
            self.choice_matcher.regex_scan,
            #settings.SAST_TIMEOUT,
            5,
            file_contents,
            rule_path)
