#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
워크플로우 UI 구성요소
"""

from ovis.ui.workflow.workflow_view import WorkflowView
from ovis.ui.workflow.workflow_editor import WorkflowEditor
from ovis.ui.workflow.workflow_runner import WorkflowRunner

__all__ = [
    'WorkflowView',
    'WorkflowEditor',
    'WorkflowRunner'
]

def __getattr__(name):
    if name == 'WorkflowView':
        from ovis.ui.workflow.workflow_view import WorkflowView
        return WorkflowView
    elif name == 'WorkflowEditor':
        from ovis.ui.workflow.workflow_editor import WorkflowEditor
        return WorkflowEditor
    elif name == 'WorkflowRunner':
        from ovis.ui.workflow.workflow_runner import WorkflowRunner
        return WorkflowRunner
    raise AttributeError(f"module {__name__} has no attribute {name}") 