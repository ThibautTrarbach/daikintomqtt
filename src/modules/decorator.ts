import {
	ModuleDeviceMetadata,
	ModulePropertyMetadata,
	ModulesDescriptionMetadata,
} from "../types";

export const PROPERTY_METADATA_CMD = Symbol("PROPERTY_METADATA_CMD");
export const PROPERTY_METADATA_DAIKIN = Symbol("PROPERTY_METADATA_DAIKIN");
export const PROPERTY_METADATA_DAIKIN_DEVICE = Symbol("PROPERTY_METADATA_DAIKIN_DEVICE");

export interface IAllPropertyMetadata {
	[key: string]: ModulesDescriptionMetadata | ModulePropertyMetadata | ModuleDeviceMetadata;
}

function defineMetadata(
	symbol: symbol,
	metadata: ModulesDescriptionMetadata | ModulePropertyMetadata | ModuleDeviceMetadata,
): PropertyDecorator {
	return function (target: Object, propertyKey: string | symbol): void {
		const allMetadata = Reflect.getMetadata(symbol, target) || {};
		allMetadata[propertyKey] = allMetadata[propertyKey] || {};
		const ownKeys = Reflect.ownKeys(metadata);
		ownKeys.forEach((key) => {
			// @ts-ignore
			allMetadata[propertyKey][key] = (metadata as IAllPropertyMetadata)[String(key)];
		});

		Reflect.defineMetadata(
			symbol,
			allMetadata,
			target,
		);
	}
}

export function modulesDataDescription(metadata: ModulesDescriptionMetadata): PropertyDecorator {
	return defineMetadata(PROPERTY_METADATA_CMD, metadata);
}

export function modulesDaikinAcces(metadata: ModulePropertyMetadata): PropertyDecorator {
	return defineMetadata(PROPERTY_METADATA_DAIKIN, metadata);
}

export function modulesDaikinDevice(metadata: ModuleDeviceMetadata): PropertyDecorator {
	return defineMetadata(PROPERTY_METADATA_DAIKIN_DEVICE, metadata);
}
