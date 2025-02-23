<script lang="ts">
    import Dialog from '@components/widgets/Dialog.svelte';
    import { locales } from '../../db/Database';
    import {
        getBlocks,
        getUnmoderated,
        getWarnings,
        isAudience,
    } from '../../db/projects/Moderation';
    import type Project from '../../db/projects/Project';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import { getUser } from './Contexts';

    interface Props {
        project: Project;
    }

    let { project }: Props = $props();

    const user = getUser();

    /** See if this is a public project being viewed by someone who isn't a creator or collaborator */
    let audience = $derived(isAudience($user, project));
    let warnings = $derived(
        getWarnings(project.getFlags(), $locales.getLocale()),
    );
    let blocks = $derived(getBlocks(project.getFlags(), $locales.getLocale()));
    let unmoderated = $derived(
        getUnmoderated(project.getFlags(), $locales.getLocale()),
    );
</script>

<!-- If this is an audience member and one of the flags are active -->
{#if audience && warnings.length + blocks.length + unmoderated.length > 0}
    <Dialog
        show
        description={blocks.length > 0
            ? $locales.getLocale().moderation.blocked
            : warnings.length > 0
              ? $locales.getLocale().moderation.warning
              : $locales.getLocale().moderation.unmoderated}
        closeable={blocks.length === 0}
    >
        <ul>
            {#each blocks.length > 0 ? blocks : warnings.length > 0 ? warnings : unmoderated as description}
                <li><MarkupHtmlView inline markup={description} /></li>
            {/each}
        </ul>
    </Dialog>
{/if}
