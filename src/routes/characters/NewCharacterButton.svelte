<script lang="ts">
    import { goto } from '$app/navigation';
    import Feedback from '@components/app/Feedback.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { CharactersDB, locales } from '@db/Database';

    let { inline }: { inline?: boolean } = $props();

    let creating: boolean | undefined = $state(false);

    async function addCharacter() {
        creating = true;
        const id = await CharactersDB.createCharacter();
        if (id) {
            creating = false;
            goto(`/character/${id}`);
        } else creating = undefined;
    }
</script>

{#if creating}
    <Spinning></Spinning>
{:else if creating === undefined}
    <Feedback>{$locales.get((l) => l.ui.page.characters.error.create)}</Feedback
    >
{:else}
    <Button
        background={inline}
        tip={$locales.get((l) => l.ui.page.characters.button.new)}
        action={addCharacter}
        active={!creating}
        large={!inline}
        icon="+"
    ></Button>
{/if}
