<script lang="ts">
    import { getCaret } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import Name from '@nodes/Name';
    import NameToken from '@nodes/NameToken';
    import Sym from '@nodes/Sym';
    import type Token from '@nodes/Token';
    import { toTokens } from '@parser/toTokens';
    import TokenTextEditor from './TokenEditor.svelte';

    interface Props {
        name: Token;
        project: Project;
        text: string;
        placeholder: string;
    }

    let { name, project, text, placeholder }: Props = $props();

    const caret = getCaret();
</script>

<TokenTextEditor
    token={name}
    {project}
    {text}
    {placeholder}
    validator={(newName) => {
        const tokens = toTokens(newName);
        return tokens.remaining() === 2 &&
            tokens.nextIsOneOf(Sym.Name, Sym.Placeholder)
            ? true
            : $locales.get((l) => l.ui.source.error.invalidName);
    }}
    creator={(text) => {
        if (caret && $caret) {
            const parent = project.getRoot(name)?.getParent(name);
            if (parent instanceof Name) {
                const edit = $caret.rename(parent, text, project, 0);
                if (edit) return [edit[2].name, edit[0]];
            }
        }

        return new NameToken(text);
    }}
/>
