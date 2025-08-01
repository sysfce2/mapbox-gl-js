import getType from '../util/get_type';
import validate from './validate';
import ValidationError from '../error/validation_error';

import type {ValidationOptions} from './validate';

type Options = ValidationOptions & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arrayElementValidator: any;
};

export default function validateArray(options: Options): Array<ValidationError> {
    const array = options.value;
    const arraySpec = options.valueSpec;
    const style = options.style;
    const styleSpec = options.styleSpec;
    const key = options.key;
    const validateArrayElement = options.arrayElementValidator || validate;

    if (getType(array) !== 'array') {
        return [new ValidationError(key, array, `array expected, ${getType(array)} found`)];
    }

    if (arraySpec.length && array.length !== arraySpec.length) {
        return [new ValidationError(key, array, `array length ${arraySpec.length} expected, length ${array.length} found`)];
    }

    if (arraySpec['min-length'] && array.length < arraySpec['min-length']) {
        return [new ValidationError(key, array, `array length at least ${arraySpec['min-length']} expected, length ${array.length} found`)];
    }

    let arrayElementSpec = {
        "type": arraySpec.value,
        "values": arraySpec.values,
        "minimum": arraySpec.minimum,
        "maximum": arraySpec.maximum,
        function: undefined
    };

    if (styleSpec.$version < 7) {
        arrayElementSpec.function = arraySpec.function;
    }

    if (getType(arraySpec.value) === 'object') {
        arrayElementSpec = arraySpec.value;
    }

    let errors: ValidationError[] = [];
    for (let i = 0; i < array.length; i++) {
        errors = errors.concat(validateArrayElement({
            array,
            arrayIndex: i,
            value: array[i],
            valueSpec: arrayElementSpec,
            style,
            styleSpec,
            key: `${key}[${i}]`
        }, true));
    }

    return errors;
}
