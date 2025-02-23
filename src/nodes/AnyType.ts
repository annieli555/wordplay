import type { NodeDescriptor } from '@locale/NodeTexts';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import { PLACEHOLDER_SYMBOL } from '../parser/Symbols';
import Type from './Type';

export default class AnyType extends Type {
    constructor() {
        super();
    }

    getDescriptor(): NodeDescriptor {
        return 'AnyType';
    }

    getGrammar() {
        return [];
    }

    acceptsAll() {
        return true;
    }

    getBasisTypeName(): BasisTypeName {
        return 'any';
    }

    computeConflicts() {
        return [];
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.AnyType);
    }

    toWordplay() {
        return PLACEHOLDER_SYMBOL;
    }

    clone() {
        return this;
    }

    getCharacter() {
        return Characters.Placeholder;
    }
}
