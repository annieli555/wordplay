import { expect, test } from 'vitest';
import Project from '../db/projects/Project';
import DefaultLocale from '../locale/DefaultLocale';
import parseType from '../parser/parseType';
import { toTokens } from '../parser/toTokens';
import Source from './Source';

test.each([
    ["'hi'|'hello'", "''"],
    ["'hi'/en|'hello'/en", "''/en"],
    ["'hi'/en|'hi'/fr", "''/en|''/fr"],
    ['1|2|3', '#'],
    ['1m|2|3', '#'],
    ['1m|2m|3m', '#m'],
    ['[1|2|3]', '[#]'],
    ['{1}', '{#}'],
    ['{1|2:2|3}', '{#:#}'],
])('expect %s', (given: string, expected) => {
    const source = new Source('untitled', '');
    const project = Project.make(null, 'untitled', source, [], DefaultLocale);
    const context = project.getContext(source);

    const type = parseType(toTokens(given));
    const generalized = type.generalize(context);

    expect(generalized.toWordplay()).toBe(expected);
});
