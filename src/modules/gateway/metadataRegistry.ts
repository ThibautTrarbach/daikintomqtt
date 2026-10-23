import 'reflect-metadata';
import {
	PROPERTY_METADATA_CMD,
	PROPERTY_METADATA_DAIKIN,
	PROPERTY_METADATA_DAIKIN_DEVICE,
} from '../decorator';
import {
	ModuleDeviceMetadata,
	ModulePropertyMetadata,
	ModulesDescriptionMetadata,
} from '../../types';

interface CharacteristicDefinition {
	propertyKey: string;
	daikin: ModulePropertyMetadata;
	description: ModulesDescriptionMetadata;
}

function appendMetadata(
	symbol: symbol,
	target: object,
	propertyKey: string,
	metadata: Record<string, unknown>,
): void {
	const allMetadata = Reflect.getMetadata(symbol, target) || {};
	allMetadata[propertyKey] = { ...(allMetadata[propertyKey] || {}), ...metadata };
	Reflect.defineMetadata(symbol, allMetadata, target);
}

function registerCharacteristic(target: object, def: CharacteristicDefinition): void {
	appendMetadata(PROPERTY_METADATA_DAIKIN, target, def.propertyKey, def.daikin as unknown as Record<string, unknown>);
	appendMetadata(PROPERTY_METADATA_CMD, target, def.propertyKey, def.description as unknown as Record<string, unknown>);
}

function registerCharacteristics(target: object, defs: CharacteristicDefinition[]): void {
	for (const def of defs) {
		registerCharacteristic(target, def);
	}
}

function registerDeviceMetadata(target: object, deviceKey: string, metadata: ModuleDeviceMetadata): void {
	appendMetadata(PROPERTY_METADATA_DAIKIN_DEVICE, target, deviceKey, metadata as unknown as Record<string, unknown>);
}

function installPropertyAccessors(target: object, propertyKey: string, _settable: boolean): void {
	const setterName = propertyKey.replace(/^_/, '');
	Object.defineProperty(target, setterName, {
		set(value: unknown) {
			(target as Record<string, unknown>)[propertyKey] = value;
		},
		enumerable: false,
		configurable: true,
	});
}

function installGatewayProperties(target: object, defs: CharacteristicDefinition[]): void {
	for (const def of defs) {
		installPropertyAccessors(target, def.propertyKey, def.description.settable);
	}
}

export type {
	CharacteristicDefinition,
};

export {
	registerCharacteristic,
	registerCharacteristics,
	registerDeviceMetadata,
	installGatewayProperties,
};
