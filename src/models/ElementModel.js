import { BaseController } from 'utility-base-controllers';
import StateModel from './StateModel.js';
import ConfigModel from './ConfigModel.js';
import ElementController from '../controllers/ElementController.js';

/**
 * Coordinates the config model and the state loader
 */
class ElementControllerModel extends BaseController {
    constructor(options) {
        super({
            controllerClass: ElementController,
            ...options
        });

        this._stateModel = options.stateModel
            ? options.stateModel
            // default state model: in-memory
            : new StateModel({
                logger: this.logger
            });

        this._configModel = options.configModel
            ? options.configModel
            // default config model: in-memory
            : new ConfigModel({
                logger: this.logger
            });
    }

    get stateModel() {
        return this._stateModel;
    }

    get configModel() {
        return this._configModel;
    }

    async load(options) {
        const [
            configController,
            stateController
        ] = await Promise.all([
            this.configModel.load(options?.config?.provider, options?.config?.options),
            this.stateModel.load(options?.state?.provider, options?.state?.options)
        ]);

        return new this.options.controllerClass({
            logger: this.logger,
            configController: configController,
            stateController: stateController
        });
    }
}

export default ElementControllerModel;