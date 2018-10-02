import * as ts from 'typescript/lib/tsserverlibrary';

import * as pluginApi from '../tsc_wrapped/plugin_api';

import {Checker} from './checker';
import {registerRules} from './runner';

// Installs the Tsetse language server plugin, which checks Tsetse rules in your
// editor and shows issues as semantic errors (red squiggly underline).

function init() {
  return {
    create(info: ts.server.PluginCreateInfo) {
      const oldService = info.languageService;
      const program = oldService.getProgram();
      if(!program) {
        throw Error('Could not load original service');
      }
      const checker = new Checker(program);

      // Add disabledRules to tsconfig to disable specific rules
      // "plugins": [
      //   {"name": "...", "disabledRules": ["equals-nan"]}
      // ]
      registerRules(checker, info.config.disabledRules || []);

      const proxy = pluginApi.createProxy(oldService);
      proxy.getSemanticDiagnostics = (fileName: string) => {
        const result = [...oldService.getSemanticDiagnostics(fileName)];
        result.push(
            ...checker.execute(program.getSourceFile(fileName)!)
                .map(failure => failure.toDiagnostic()));
        return result;
      };
      return proxy;
    }
  };
}

export = init;
