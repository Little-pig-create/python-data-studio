import { JupyterFrontEnd } from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';

const PROTOCOL_VERSION = 1;
const SOURCE = 'jupyter-runtime';
const PARENT_SOURCE = 'course-shell';

function envelope(type, payload = {}, requestId) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    source: SOURCE,
    type,
    requestId,
    timestamp: Date.now(),
    payload
  };
}

function currentNotebook(tracker) {
  if (tracker.currentWidget) return tracker.currentWidget;
  let latestWidget;
  tracker.forEach(widget => {
    latestWidget = widget;
  });
  return latestWidget;
}

function send(message) {
  if (window.parent === window) return;
  window.parent.postMessage(message, window.location.origin);
}

function emitNotebookState(tracker) {
  const widget = currentNotebook(tracker);
  if (!widget) return;
  const context = widget.context;
  send(envelope('notebook:opened', {
    path: context.path,
    title: context.path.split('/').pop() || 'Notebook'
  }));
  send(envelope('notebook:dirty-changed', { isDirty: context.isModified }));
  send(envelope('notebook:save-state', {
    state: context.isReady ? (context.isModified ? 'dirty' : 'saved') : 'saving'
  }));
}

function attachNotebookSignals(app, widget) {
  if (widget.__courseBridgeAttached) return;
  widget.__courseBridgeAttached = true;
  let syncFrame = 0;
  let syncTimer = 0;

  const scheduleCellControls = () => {
    if (syncFrame) return;
    syncFrame = window.requestAnimationFrame(() => {
      syncFrame = 0;
      addCellControls();
    });
  };

  const scheduleOutputControls = () => {
    scheduleCellControls();
    // The output model changes before Lumino has always completed mounting the
    // output wrapper. This one event-driven follow-up lets the real renderer
    // settle without a polling loop.
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(scheduleCellControls, 64);
  };

  const addCellControls = () => {
    for (const cell of widget.content.widgets) {
      let insertLayer = Array.from(cell.node.children).find(
        child => child.classList.contains('course-cell-insert')
      );
      if (!insertLayer) {
        insertLayer = document.createElement('div');
        insertLayer.className = 'course-cell-insert';
        insertLayer.setAttribute('role', 'group');
        insertLayer.setAttribute('aria-label', '在下方插入单元格');

        const divider = document.createElement('span');
        divider.className = 'course-cell-insert-divider';
        divider.setAttribute('aria-hidden', 'true');

        const actions = document.createElement('div');
        actions.className = 'course-cell-insert-actions';

        for (const { type, label } of [
          { type: 'code', label: '代码' },
          { type: 'markdown', label: '文本' }
        ]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'course-cell-insert-button';
          button.setAttribute('aria-label', `在下方添加${label}单元格`);
          button.title = `添加${label}单元格`;

          const plus = document.createElement('span');
          plus.className = 'course-cell-insert-plus';
          plus.textContent = '+';
          plus.setAttribute('aria-hidden', 'true');

          const text = document.createElement('span');
          text.textContent = label;
          button.append(plus, text);

          button.addEventListener('pointerdown', event => {
            event.stopPropagation();
          });
          button.addEventListener('click', async event => {
            event.preventDefault();
            event.stopPropagation();
            const index = widget.content.widgets.indexOf(cell);
            if (index < 0) return;

            widget.content.activeCellIndex = index;
            app.shell.activateById(widget.id);
            button.disabled = true;
            try {
              await app.commands.execute('notebook:insert-cell-below');
              await app.commands.execute(
                type === 'markdown'
                  ? 'notebook:change-cell-to-markdown'
                  : 'notebook:change-cell-to-code'
              );
              scheduleCellControls();
            } finally {
              button.disabled = false;
            }
          });
          actions.append(button);
        }

        insertLayer.append(divider, actions);
        cell.node.append(insertLayer);
      }

      if (cell.model.type !== 'code') continue;

      const inputWrapper = cell.node.querySelector('.jp-Cell-inputWrapper');
      if (!inputWrapper) continue;

      let controlLayer = inputWrapper.querySelector('.course-cell-controls');
      if (!controlLayer) {
        controlLayer = document.createElement('div');
        controlLayer.className = 'course-cell-controls';
        inputWrapper.append(controlLayer);
      }

      if (!controlLayer.querySelector('.course-cell-run')) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'course-cell-run';
        button.setAttribute('aria-label', '运行此单元格');
        button.title = '运行此单元格';
        button.textContent = 'Run';
        button.addEventListener('click', async event => {
          event.preventDefault();
          event.stopPropagation();
          const index = widget.content.widgets.indexOf(cell);
          if (index < 0) return;
          widget.content.activeCellIndex = index;
          app.shell.activateById(widget.id);
          button.disabled = true;
          button.classList.add('is-running');
          try {
            await app.commands.execute('notebook:run-cell');
          } finally {
            button.disabled = false;
            button.classList.remove('is-running');
          }
        });
        controlLayer.append(button);
      }

      // Colab keeps the execution count outside the bordered editor frame.
      // Mount the model-backed badge on the cell itself so it is not clipped
      // by the fixed run gutter or CodeMirror's overflow handling.
      let executionBadge = Array.from(cell.node.children).find(
        child => child.classList.contains('course-cell-execution')
      );
      if (!executionBadge) {
        executionBadge = controlLayer.querySelector('.course-cell-execution');
      }
      if (!executionBadge) {
        executionBadge = document.createElement('span');
        executionBadge.className = 'course-cell-execution';
        executionBadge.setAttribute('aria-hidden', 'true');
      }
      if (executionBadge.parentElement !== cell.node) {
        cell.node.insertBefore(executionBadge, inputWrapper);
      }
      const executionCount = cell.model.executionCount;
      executionBadge.textContent = `[${executionCount == null ? ' ' : executionCount}]`;

      if (!cell.__courseOutputSignalsAttached) {
        cell.__courseOutputSignalsAttached = true;
        if (cell.model.stateChanged) cell.model.stateChanged.connect(scheduleOutputControls);
        if (cell.model.outputs && cell.model.outputs.changed) {
          cell.model.outputs.changed.connect(scheduleOutputControls);
        }
      }

      const outputWrapper = cell.node.querySelector('.jp-Cell-outputWrapper');
      if (!outputWrapper) continue;

      let outputGutter = outputWrapper.querySelector('.course-output-gutter');
      if (!outputGutter) {
        outputGutter = document.createElement('div');
        outputGutter.className = 'course-output-gutter';

        const outputButton = document.createElement('button');
        outputButton.type = 'button';
        outputButton.className = 'course-output-toggle';
        outputButton.textContent = '...';
        outputButton.setAttribute('aria-label', '折叠输出');
        outputButton.setAttribute('aria-expanded', 'true');
        outputButton.title = '折叠输出';
        outputButton.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          const collapsed = cell.node.classList.toggle('course-output-collapsed');
          outputButton.setAttribute('aria-label', collapsed ? '展开输出' : '折叠输出');
          outputButton.title = collapsed ? '展开输出' : '折叠输出';
          outputButton.setAttribute('aria-expanded', String(!collapsed));
        });
        outputGutter.append(outputButton);
        outputWrapper.prepend(outputGutter);
      }

      let outputExecution = Array.from(outputWrapper.children).find(
        child => child.classList.contains('course-output-execution')
      );
      if (!outputExecution) {
        outputExecution = outputGutter.querySelector('.course-output-execution');
      }
      if (!outputExecution) {
        outputExecution = document.createElement('span');
        outputExecution.className = 'course-output-execution';
        outputExecution.setAttribute('aria-hidden', 'true');
      }
      if (outputExecution.parentElement !== outputWrapper) {
        outputWrapper.insertBefore(outputExecution, outputGutter);
      }

      const outputButton = outputGutter.querySelector('.course-output-toggle');
      const hasOutput = Boolean(cell.model.outputs && cell.model.outputs.length);
      const count = cell.model.executionCount;
      outputExecution.textContent = '[' + (count == null ? ' ' : count) + ']';
      outputExecution.hidden = !hasOutput;
      outputButton.hidden = !hasOutput;
      if (!hasOutput) cell.node.classList.remove('course-output-collapsed');
    }
  };

  scheduleCellControls();
  if (widget.content.modelContentChanged) {
    widget.content.modelContentChanged.connect(scheduleCellControls);
  }
  if (widget.content.cellInViewportChanged) {
    widget.content.cellInViewportChanged.connect(scheduleCellControls);
  }
  widget.content.activeCellChanged.connect((_sender, cell) => {
    if (!cell) return;
    send(envelope('cell:selected', {
      cellId: cell.model.id,
      cellType: cell.model.type
    }));
  });
  widget.context.saveState.connect((_sender, state) => {
    send(envelope('notebook:save-state', { state }));
  });
  widget.context.sessionContext.statusChanged.connect((_sender, state) => {
    send(envelope('kernel:state-changed', {
      state,
      kernelName: widget.context.sessionContext.kernelDisplayName || 'Python'
    }));
  });
}

const plugin = {
  id: 'jupyterlite-course-bridge:plugin',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app, tracker) => {
    // The course shell already owns navigation. Remove Lab workbench panels
    // rather than merely revealing/collapsing a second file browser. The
    // NotebookPanel stays in the main area and continues to provide cells,
    // editing, output, running, and saving.
    const removeWorkbenchPanels = () => {
      try {
        // Use LabShell's supported single-document mode. This removes the
        // empty workbench header while preserving the NotebookPanel toolbar.
        if (app.shell.mode !== 'single-document') {
          app.shell.mode = 'single-document';
        }
        if (app.shell.isTopInSimpleModeVisible()) {
          app.shell.toggleTopInSimpleModeVisibility();
        }

        for (const area of ['left', 'right', 'bottom']) {
          for (const widget of app.shell.widgets(area)) {
            widget.close();
          }
        }

        // JupyterLite can briefly create a Launcher before resolving `path`.
        // It is not part of the course experience, so close it whenever it
        // appears while leaving all notebook documents untouched.
        for (const widget of app.shell.widgets('main')) {
          if (widget.id.startsWith('launcher-') || widget.title.label === 'Launcher') {
            widget.close();
          }
        }

        if (!app.shell.leftCollapsed) {
          app.shell.collapseLeft();
        }
        if (!app.shell.rightCollapsed) {
          app.shell.collapseRight();
        }
      } catch (_error) {
        // The Lab shell may not be fully restored during early startup.
      }
    };

    const scheduleNotebookSurface = () => {
      removeWorkbenchPanels();
      window.setTimeout(removeWorkbenchPanels, 0);
      window.setTimeout(removeWorkbenchPanels, 180);
    };

    const onCurrentChanged = () => {
      const widget = currentNotebook(tracker);
      if (widget) attachNotebookSignals(app, widget);
      emitNotebookState(tracker);
      scheduleNotebookSurface();
    };
    tracker.currentChanged.connect(onCurrentChanged);
    tracker.widgetAdded.connect((_sender, widget) => {
      attachNotebookSignals(app, widget);
      scheduleNotebookSurface();
    });
    tracker.forEach(widget => attachNotebookSignals(app, widget));
    void app.restored.then(scheduleNotebookSurface);

    const onMessage = async (event) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const message = event.data;
      if (!message || message.protocolVersion !== PROTOCOL_VERSION || message.source !== PARENT_SOURCE) {
        return;
      }
      if (message.type === 'bridge:hello') {
        send(envelope('bridge:ready', { protocolVersion: PROTOCOL_VERSION }));
        emitNotebookState(tracker);
        return;
      }
      const payload = message.payload || {};
      const commandMap = {
        'cell:run-selected': 'notebook:run-cell',
        'cell:run-all': 'notebook:run-all',
        'cell:interrupt': 'kernelmenu:interrupt',
        'kernel:restart': 'kernelmenu:restart',
        'notebook:save': 'docmanager:save',
        'notebook:download': 'docmanager:download'
      };
      if (message.type === 'theme:set') {
        document.documentElement.dataset.courseTheme = payload.theme || 'course-light';
        send(envelope('theme:changed', { theme: document.documentElement.dataset.courseTheme }, message.requestId));
        return;
      }
      if (message.type === 'notebook:scroll-to-heading') {
        const widget = currentNotebook(tracker);
        if (widget && widget.content && widget.content.activeCell) {
          widget.content.activeCellIndex = Math.max(0, Number(payload.cellIndex || 0));
        }
        return;
      }
      const command = commandMap[message.type];
      if (command && app.commands.hasCommand(command)) {
        try {
          await app.commands.execute(command);
        } catch (error) {
          send(envelope('bridge:error', { code: 'command-failed', message: String(error) }, message.requestId));
        }
      }
    };

    window.addEventListener('message', onMessage);
    send(envelope('bridge:ready', { protocolVersion: PROTOCOL_VERSION }));
  }
};

export default plugin;
