export type NullTypeT = {
    kind: 'null';
};
export type NumberTypeT = {
    kind: 'number';
};
export type StringTypeT = {
    kind: 'string';
};
export type BooleanTypeT = {
    kind: 'boolean';
};
export type ColorTypeT = {
    kind: 'color';
};
export type ObjectTypeT = {
    kind: 'object';
};
export type ValueTypeT = {
    kind: 'value';
};
export type ErrorTypeT = {
    kind: 'error';
};
export type CollatorTypeT = {
    kind: 'collator';
};
export type FormattedTypeT = {
    kind: 'formatted';
};
export type ResolvedImageTypeT = {
    kind: 'resolvedImage';
};

export type EvaluationKind = 'constant' | 'source' | 'camera' | 'composite';

export type Type =
    | NullTypeT
    | NumberTypeT
    | StringTypeT
    | BooleanTypeT
    | ColorTypeT
    | ObjectTypeT
    | ValueTypeT
    | ArrayType
    | ErrorTypeT
    | CollatorTypeT
    | FormattedTypeT
    | ResolvedImageTypeT;

export type ArrayType = {
    kind: 'array';
    itemType: Type;
    N: number | null | undefined;
};

export type NativeType = 'number' | 'string' | 'boolean' | 'null' | 'array' | 'object';

export const NullType = {kind: 'null'} as const;
export const NumberType = {kind: 'number'} as const;
export const StringType = {kind: 'string'} as const;
export const BooleanType = {kind: 'boolean'} as const;
export const ColorType = {kind: 'color'} as const;
export const ObjectType = {kind: 'object'} as const;
export const ValueType = {kind: 'value'} as const;
export const ErrorType = {kind: 'error'} as const;
export const CollatorType = {kind: 'collator'} as const;
export const FormattedType = {kind: 'formatted'} as const;
export const ResolvedImageType = {kind: 'resolvedImage'} as const;

export function array(itemType: Type, N?: number | null): ArrayType {
    return {
        kind: 'array',
        itemType,
        N
    };
}

export function toString(type: Type): string {
    if (type.kind === 'array') {
        const itemType = toString(type.itemType);
        return typeof type.N === 'number' ?
            `array<${itemType}, ${type.N}>` :
            type.itemType.kind === 'value' ? 'array' : `array<${itemType}>`;
    } else {
        return type.kind;
    }
}

const valueMemberTypes = [
    NullType,
    NumberType,
    StringType,
    BooleanType,
    ColorType,
    FormattedType,
    ObjectType,
    array(ValueType),
    ResolvedImageType
];

/**
 * Returns null if `t` is a subtype of `expected`; otherwise returns an
 * error message.
 * @private
 */
export function checkSubtype(expected: Type, t: Type): string | null | undefined {
    if (t.kind === 'error') {
        // Error is a subtype of every type
        return null;
    } else if (expected.kind === 'array') {
        if (t.kind === 'array' &&
            ((t.N === 0 && t.itemType.kind === 'value') || !checkSubtype(expected.itemType, t.itemType)) &&
            (typeof expected.N !== 'number' || expected.N === t.N)) {
            return null;
        }
    } else if (expected.kind === t.kind) {
        return null;
    } else if (expected.kind === 'value') {
        for (const memberType of valueMemberTypes) {
            if (!checkSubtype(memberType, t)) {
                return null;
            }
        }
    }

    return `Expected ${toString(expected)} but found ${toString(t)} instead.`;
}

export function isValidType(provided: Type, allowedTypes: Array<Type>): boolean {
    return allowedTypes.some(t => t.kind === provided.kind);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isValidNativeType(provided: any, allowedTypes: Array<NativeType>): boolean {
    return allowedTypes.some(t => {
        if (t === 'null') {
            return provided === null;
        } else if (t === 'array') {
            return Array.isArray(provided);
        } else if (t === 'object') {
            return provided && !Array.isArray(provided) && typeof provided === 'object';
        } else {
            return t === typeof provided;
        }
    });
}

export function typeEquals(a: Type, b: Type): boolean {
    if (a.kind === 'array' && b.kind === 'array') {
        return a.N === b.N && typeEquals(a.itemType, b.itemType);
    } else {
        return a.kind === b.kind;
    }
}
