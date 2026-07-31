import { IThemeManager } from '@jupyterlab/apputils';
import '../style/index.css';

const plugin = {
  id: 'jupyterlite-course-theme:plugin',
  autoStart: true,
  requires: [IThemeManager],
  activate: (app, themeManager) => {
    const applyCourseLayout = () => {
      document.documentElement.dataset.courseMode = 'true';
      if (!app.shell.leftCollapsed) {
        app.shell.collapseLeft();
      }
    };

    themeManager.register({
      name: 'jupyterlite-course-theme:theme',
      displayName: 'Python Data Studio',
      isLight: true,
      themeScrollbars: true,
      load: async () => {
        document.documentElement.dataset.courseTheme = 'course-light';
        applyCourseLayout();
      },
      unload: async () => {
        delete document.documentElement.dataset.courseTheme;
      }
    });

    void app.restored.then(applyCourseLayout);
  }
};

export default plugin;
