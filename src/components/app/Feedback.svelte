<script lang="ts">
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Note from '@components/widgets/Note.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales, Logs } from '@db/Database';
    import {
        createFeedback,
        deleteFeedback,
        getFeedback,
        updateFeedback,
        type Feedback,
    } from '@db/feedback/FeedbackDatabase';
    import { isModerator } from '@db/projects/Moderation';
    import { CANCEL_SYMBOL, DEFECT_SYMBOL, IDEA_SYMBOL } from '@parser/Symbols';
    import Notice from './Notice.svelte';
    import Spinning from './Spinning.svelte';
    import Subheader from './Subheader.svelte';

    let mode: 'defect' | 'idea' = $state('defect');
    let title = $state('');
    let description = $state('');
    let show = $state(false);
    let submitting = $state(false);
    let error = $state(false);

    let feedback = $state<Feedback[] | undefined | null>(undefined);
    let defects = $derived(feedback?.filter((f) => f.type === 'defect'));
    let ideas = $derived(feedback?.filter((f) => f.type === 'idea'));
    let currentFeedback = $derived(mode === 'defect' ? defects : ideas);
    let expanded: boolean[] = $state([]);
    let votes = $state<Set<string>>(new Set());

    const user = getUser();

    let moderator = $state(false);
    $effect(() => {
        if ($user) isModerator($user).then((mod) => (moderator = mod));
    });

    $effect(() => {
        if (show || !submitting) loadFeedback();
    });

    function loadFeedback() {
        getFeedback().then((f: Feedback[] | null) => {
            feedback = f?.toSorted((a, b) => a.created - b.created);
            expanded = feedback ? new Array(feedback.length).fill(false) : [];
        });
    }

    async function submit() {
        if ($user === null) return;
        submitting = true;

        const newFeedback = await createFeedback(
            $user.uid,
            title,
            description,
            mode,
            window.navigator.userAgent,
            window.location.href,
            mode === 'defect' ? Logs.join('\n') : '',
        );
        if (newFeedback === null) {
            error = true;
            submitting = false;
            return;
        }
        if (feedback) feedback.push(newFeedback);

        submitting = false;
        title = '';
        description = '';
        error = false;
    }

    async function vote(feed: Feedback) {
        const newFeedback = { ...feed, votes: feed.votes + 1 };
        const success = await updateFeedback(newFeedback);
        if (success && feedback) {
            votes.add(feed.id);
            feedback = feedback.map((f) =>
                f.id === feed.id ? newFeedback : f,
            );
        } else error = true;
    }

    async function close(feed: Feedback) {
        const newFeedback: Feedback = { ...feed, status: 'resolved' };
        const success = await updateFeedback(newFeedback);
        if (success && feedback)
            feedback = feedback.filter((f) => f.id !== feed.id);
        else error = true;
    }
</script>

{#snippet feedbackView(feed: Feedback, index: number)}
    <div class="feedback" class:expanded={expanded[index]}>
        <div
            role="button"
            class="header"
            tabindex="0"
            onpointerdown={(event) =>
                event.button === 0 && (expanded[index] = !expanded[index])}
            onkeydown={(event) =>
                event.key === 'Enter' && (expanded[index] = !expanded[index])}
        >
            <Subheader>
                {feed.type === 'defect' ? DEFECT_SYMBOL : IDEA_SYMBOL}
                {#if feed.creator === $user?.uid || moderator}
                    <TextField
                        editable={!submitting}
                        bind:text={feed.title}
                        description={(l) =>
                            l.ui.dialog.feedback.field.title.description}
                        placeholder={(l) =>
                            l.ui.dialog.feedback.field.title.placeholder}
                        id={'feedback-title'}
                        done={(t) => {
                            updateFeedback({ ...feed, ...{ title: t } });
                        }}
                        max="20em"
                    />
                {:else}
                    {feed.title}
                {/if}
            </Subheader>
            <div class="tools">
                <Button
                    tip={(l) => l.ui.dialog.feedback.button.like}
                    icon="⭐️"
                    active={!votes.has(feed.id)}
                    action={() => vote(feed)}>{feed.votes}</Button
                >
                {#if feed.creator === $user?.uid || moderator}
                    <Button
                        tip={(l) => l.ui.dialog.feedback.button.close.tip}
                        icon="✓"
                        label={(l) => l.ui.dialog.feedback.button.close.label}
                        action={() => close(feed)}
                    ></Button>
                    <ConfirmButton
                        icon={CANCEL_SYMBOL}
                        tip={(l) =>
                            l.ui.dialog.feedback.button.delete.description}
                        prompt={(l) =>
                            l.ui.dialog.feedback.button.delete.prompt}
                        action={async () => {
                            await deleteFeedback(feed.id);
                            loadFeedback();
                        }}
                    ></ConfirmButton>
                {/if}
            </div>
        </div>
        {#if expanded[index]}
            {#if feed.creator === $user?.uid || moderator}
                {#if mode === 'defect'}
                    <TextBox
                        bind:text={feed.description}
                        description={(l) =>
                            l.ui.dialog.feedback.field.defect.description}
                        placeholder={(l) =>
                            l.ui.dialog.feedback.field.defect.placeholder}
                        id={'defect-description'}
                        done={(t) => {
                            updateFeedback({ ...feed, ...{ description: t } });
                        }}
                    />
                {:else}
                    <TextBox
                        active={!submitting}
                        bind:text={description}
                        description={(l) =>
                            l.ui.dialog.feedback.field.idea.description}
                        placeholder={(l) =>
                            l.ui.dialog.feedback.field.idea.placeholder}
                        id={'idea-description'}
                        done={(t) => {
                            updateFeedback({ ...feed, ...{ description: t } });
                        }}
                    />
                {/if}
            {:else}
                {#each feed.description.split('\n') as paragraph}
                    <p>{paragraph}</p>
                {/each}
            {/if}
            <Note>
                {#if feed.logs.trim().length > 0}
                    <hr />
                    <ul>
                        {#each feed.logs.split('\n') as log}
                            <li>{log}</li>
                        {/each}
                    </ul>
                {/if}
                {#if feed.type === 'defect'}
                    <hr />
                    {feed.browser}
                {/if}
                <hr />
                {feed.url}
            </Note>
        {/if}
    </div>

    <style>
        .feedback {
            padding: var(--wordplay-spacing);
            border: var(--wordplay-border-color) solid
                var(--wordplay-border-width);
            background-color: var(--color-background);
            border-radius: var(--wordplay-border-radius);
            transition: max-height calc(var(--animation-factor) * 100ms);
            max-height: 5em;
            overflow: hidden;
        }

        .feedback.expanded {
            max-height: 100vh;
            overflow: auto;
        }

        .header {
            display: flex;
            align-items: baseline;
            gap: var(--wordplay-spacing);
            cursor: pointer;
            border-radius: var(--wordplay-border-radius);
        }

        .tools {
            display: flex;
            flex-direction: row;
            gap: var(--wordplay-spacing);
            margin-left: auto;
        }
    </style>
{/snippet}

<Dialog
    bind:show
    header={(l) => l.ui.dialog.feedback.header}
    explanation={(l) => l.ui.dialog.feedback.explanation}
    button={{
        tip: (l) => l.ui.dialog.feedback.button.show,
        icon: `${IDEA_SYMBOL}/${DEFECT_SYMBOL}`,
    }}
>
    <Mode
        choice={mode === 'defect' ? 0 : 1}
        modes={[
            `${DEFECT_SYMBOL} ${$locales.get((l) => l.ui.dialog.feedback.subheader.defect)}`,
            `${IDEA_SYMBOL} ${$locales.get((l) => l.ui.dialog.feedback.subheader.idea)}`,
        ]}
        descriptions={(l) => l.ui.dialog.feedback.mode}
        select={(num) => (mode = num === 0 ? 'defect' : 'idea')}
    />

    {#if currentFeedback === undefined}
        <Spinning />
    {:else if currentFeedback === null}
        <Notice text={(l) => l.ui.dialog.feedback.error.load}></Notice>
    {:else}
        <div class="feedback-list">
            {#if currentFeedback.length === 0}
                <Notice text={(l) => l.ui.dialog.feedback.error.empty}></Notice>
            {:else}
                {#each currentFeedback as f, index}{@render feedbackView(
                        f,
                        index,
                    )}{/each}
            {/if}
        </div>
    {/if}

    {#if $user === null}
        <Notice text={(l) => l.ui.dialog.feedback.error.login}></Notice>
    {:else}
        {#if currentFeedback !== undefined && currentFeedback !== null && currentFeedback.length > 0}
            {#if mode === 'defect'}
                <MarkupHtmlView
                    markup={(l) => l.ui.dialog.feedback.prompt.defect}
                />
            {:else}
                <MarkupHtmlView
                    markup={(l) => l.ui.dialog.feedback.prompt.idea}
                />
            {/if}
        {/if}

        <Subheader>
            <TextField
                editable={!submitting}
                bind:text={title}
                description={(l) =>
                    l.ui.dialog.feedback.field.title.description}
                placeholder={(l) =>
                    l.ui.dialog.feedback.field.title.placeholder}
                id={'feedback-title'}
                done={(t) => (title = t)}
                max="20em"
            />
        </Subheader>

        {#if mode === 'defect'}
            <TextBox
                active={!submitting}
                bind:text={description}
                description={(l) =>
                    l.ui.dialog.feedback.field.defect.description}
                placeholder={(l) =>
                    l.ui.dialog.feedback.field.defect.placeholder}
                id={'defect-description'}
                done={(t) => (description = t)}
            />
        {:else}
            <TextBox
                active={!submitting}
                bind:text={description}
                description={(l) => l.ui.dialog.feedback.field.idea.description}
                placeholder={(l) => l.ui.dialog.feedback.field.idea.placeholder}
                id={'idea-description'}
                done={(t) => (description = t)}
            />
        {/if}

        <Button
            background
            active={!submitting && title.length > 0 && description.length > 0}
            tip={(l) => l.ui.dialog.feedback.button.submit.tip}
            icon={mode === 'defect' ? DEFECT_SYMBOL : IDEA_SYMBOL}
            label={(l) => l.ui.dialog.feedback.button.submit.label}
            action={submit}
        ></Button>

        {#if error}
            <Notice text={(l) => l.ui.dialog.feedback.error.submit}></Notice>
        {/if}
    {/if}
</Dialog>

<style>
    .feedback-list {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-top: 1em;
        margin-bottom: 1em;
    }
</style>
