<!-- 
 This chat component enables communication between project collaborators and owners of the gallery that a project is in. 
 -->
<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import CreatorList from '@components/project/CreatorList.svelte';
    import TileMessage from '@components/project/TileMessage.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Button from '@components/widgets/Button.svelte';
    import Labeled from '@components/widgets/Labeled.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import { type SerializedMessage } from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import {
        Chats,
        Creators,
        Galleries,
        locales,
        Projects,
    } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import type Project from '@db/projects/Project';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import { tick, untrack } from 'svelte';
    import CreatorView from '../CreatorView.svelte';
    import Link from '../Link.svelte';
    import Loading from '../Loading.svelte';

    const {
        project,
        chat,
    }: { project: Project; chat: Chat | undefined | null | false } = $props();

    const user = getUser();

    function submitMessage() {
        if (newMessage.trim() === '') return;
        if (!chat) return;
        Chats.addMessage(chat, newMessage);
        newMessage = '';
        tick().then(() => {
            if (newMessageView)
                setKeyboardFocus(
                    newMessageView,
                    'Focus on chat after submitting',
                );
        });
    }

    let owner = $derived(project.getOwner());

    // Load the gallery if it exists.
    let gallery = $state<Gallery | undefined>(undefined);
    $effect(() => {
        const galleryID = project.getGallery();
        if (galleryID) {
            Galleries.get(galleryID).then((g) => {
                gallery = g;
            });
        } else gallery = undefined;
    });

    let newMessage = $state('');
    let newMessageView = $state<HTMLTextAreaElement | undefined>();
    let scrollerView = $state<HTMLDivElement | undefined>();

    // When the project changes, mark read if it was unread and scroll.
    $effect(() => {
        if (chat && $user && chat.hasUnread($user.uid)) {
            untrack(() => {
                Chats.updateChat(chat.asRead($user.uid), true);
            });
        }

        // After the chat is visible, scroll to the bottom.
        tick().then(() => {
            if (scrollerView)
                scrollerView.scrollTop = scrollerView.scrollHeight;
        });
    });

    let creators: Record<string, Creator | null> = $state({});

    // Set the creators to whatever user IDs we have.
    $effect(() => {
        const owner = project.getOwner();
        // We async load all participants, regardless of their chat eligibility, since we need to render
        // their names.
        Creators.getCreatorsByUIDs(
            chat
                ? [...chat.getAllParticipants(), ...(owner ? [owner] : [])]
                : owner
                  ? [owner]
                  : [],
        ).then((map) => (creators = map));
    });

    let editable = $derived($user !== null && project.getOwner() === $user.uid);
    let collaborator = $derived(
        $user !== null && project.hasCollaborator($user.uid),
    );

    function startChat() {
        Chats.addChat(project, gallery);
    }

    function areSameDay(a: Date, b: Date): boolean {
        return (
            a.getDate() === b.getDate() &&
            a.getMonth() === b.getMonth() &&
            a.getFullYear() === b.getFullYear()
        );
    }

    function deleteMessage(chat: Chat, message: SerializedMessage) {
        if (!chat) return;
        Chats.updateChat(chat.withoutMessage(message), true);
    }
</script>

{#snippet message(chat: Chat, msg: SerializedMessage)}
    {@const date = new Date(msg.time)}
    <div class="message" class:creator={$user?.uid === msg.creator}>
        <div class="meta"
            ><CreatorView
                chrome={false}
                anonymize={false}
                creator={creators[msg.creator]}
                fade={!chat.isEligible(msg.creator)}
            />
            <div class="when"
                >{areSameDay(new Date(), date)
                    ? date.toLocaleTimeString(undefined, { timeStyle: 'short' })
                    : date.toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                      })}</div
            >
            {#if $user?.uid === msg.creator && msg.text !== null}
                <Button
                    tip={(l) => l.ui.collaborate.button.delete}
                    action={() => deleteMessage(chat, msg)}
                    icon={CANCEL_SYMBOL}
                ></Button>
            {/if}
        </div>
        <div class="what"
            >{#if msg.text === null}<em
                    ><LocalizedText
                        path={(l) => l.ui.collaborate.error.deleted}
                    /></em
                >{:else}<MarkupHTMLView
                    markup={msg.text.replaceAll('\n', '\n\n')}
                />{/if}</div
        >
    </div>
{/snippet}

{#if owner === null}
    <TileMessage error>
        <p><LocalizedText path={(l) => l.ui.collaborate.error.unowned} /></p>
    </TileMessage>
{:else}
    <section
        class="collab"
        aria-label={$locales.get((l) => l.ui.collaborate.label)}
    >
        <MarkupHTMLView
            markup={editable
                ? project.getCollaborators().length === 0
                    ? (l) => l.ui.collaborate.prompt.solo
                    : (l) => l.ui.collaborate.prompt.owner
                : collaborator
                  ? (l) => l.ui.collaborate.prompt.collaborator
                  : (l) => l.ui.collaborate.prompt.curator}
        ></MarkupHTMLView>

        <div class="everyone">
            <!-- If not the owner, show it -->
            {#if $user !== null && owner !== $user.uid}
                <Labeled label={(l) => l.ui.collaborate.role.owner}>
                    <CreatorView
                        chrome
                        anonymize={false}
                        creator={creators[owner]}
                    />
                </Labeled>
            {/if}

            <!-- Show all of the collaborators -->
            {#if owner == $user?.uid || project.getCollaborators().length > 0}
                <Labeled label={(l) => l.ui.collaborate.role.collaborators}>
                    <CreatorList
                        anonymize={false}
                        uids={project.getCollaborators()}
                        {editable}
                        add={(userID) =>
                            Projects.reviseProject(
                                project.withCollaborator(userID),
                            )}
                        remove={(userID) =>
                            Projects.reviseProject(
                                project.withoutCollaborator(userID),
                            )}
                        removable={() => true}
                    />
                </Labeled>
            {/if}

            <!-- Show the curators, if in a gallery -->
            {#if gallery}
                <Labeled label={(l) => l.ui.collaborate.role.curators}>
                    <CreatorList
                        anonymize={false}
                        editable={false}
                        uids={gallery.getCurators()}
                    />
                </Labeled>
            {/if}
        </div>

        {#if chat === null}
            <Loading></Loading>
        {:else if chat === false}
            <TileMessage error>
                <p
                    ><LocalizedText
                        path={(l) => l.ui.collaborate.error.offline}
                    /></p
                >
            </TileMessage>
        {:else if chat == undefined}
            <TileMessage>
                <p
                    ><Button
                        tip={(l) => l.ui.collaborate.button.start.tip}
                        action={startChat}
                        background
                        ><LocalizedText
                            path={(l) => l.ui.collaborate.button.start.label}
                        /></Button
                    ></p
                >
            </TileMessage>
        {:else}
            <div class="scroller" bind:this={scrollerView}>
                <div class="messages">
                    {#each chat.getMessages() as msg}
                        {@render message(chat, msg)}
                    {:else}
                        <Note
                            ><LocalizedText
                                path={(l) => l.ui.collaborate.error.empty}
                            /></Note
                        >
                    {/each}
                </div>
            </div>
            <form class="new" data-sveltekit-keepfocus>
                <div class="controls">
                    <TextBox
                        id="new-message"
                        placeholder={(l) =>
                            l.ui.collaborate.field.message.placeholder}
                        description={(l) =>
                            l.ui.collaborate.field.message.description}
                        bind:view={newMessageView}
                        bind:text={newMessage}
                    />
                    <Button
                        submit
                        active={chat !== undefined && newMessage.trim() !== ''}
                        tip={(l) => l.ui.collaborate.button.submit.tip}
                        action={submitMessage}
                        background
                        ><LocalizedText
                            path={(l) => l.ui.collaborate.button.submit.label}
                        /></Button
                    >
                </div>
                <div class="formats"
                    >/<em><LocalizedText path={(l) => l.token.Italic} /></em>/ *<strong
                        ><LocalizedText path={(l) => l.token.Bold} /></strong
                    >* ^<span style="font-weight: bolder"
                        ><LocalizedText path={(l) => l.token.Extra} /></span
                    >^ _&nbsp;<u
                        ><LocalizedText path={(l) => l.token.Underline} /></u
                    >&nbsp;_ \<code
                        ><LocalizedText path={(l) => l.token.Code} /></code
                    >\ &lt;<LocalizedText path={(l) => l.token.Link} />@<Link
                        to=".">https://...</Link
                    >&gt;</div
                >
            </form>
        {/if}
    </section>
{/if}

<style>
    .collab {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
    }

    .scroller {
        overflow-y: auto;
        overflow-x: clip;
        height: 100%;
        width: 100%;
        margin-block-start: auto;
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    .messages {
        display: flex;
        flex-direction: column;
        padding-top: var(--wordplay-spacing);
        padding-bottom: var(--wordplay-spacing);
    }

    .formats {
        color: var(--wordplay-header);
        font-size: calc(0.75 * var(--wordplay-small-font-size));
    }

    .new {
        display: flex;
        flex-direction: column;
        gap: calc(0.5 * var(--wordplay-spacing));
    }

    .controls {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .message {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        width: 90%;
        margin-block-end: var(--wordplay-spacing);
    }

    .creator.message {
        align-self: end;
        align-items: end;
    }

    .meta {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: baseline;
    }

    .when {
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
        white-space: nowrap;
    }

    .what {
        padding: var(--wordplay-spacing);
        background: var(--wordplay-alternating-color);
        font-size: var(--wordplay-small-font-size);
        border-radius: var(--wordplay-border-radius);
        width: fit-content;
    }

    .everyone {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
</style>
