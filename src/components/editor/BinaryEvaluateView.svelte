<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type BinaryEvaluate from '@nodes/BinaryEvaluate';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: BinaryEvaluate;
    }

    let { node }: Props = $props();

    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <div class="evaluate">
        <NodeView node={node.left} /><NodeView node={node.fun} /><NodeView
            node={node.right}
        />
    </div>
{:else}
    <NodeView node={node.left} /><NodeView node={node.fun} /><NodeView
        node={node.right}
    />
{/if}

<style>
    .evaluate {
        display: flex;
        flex-direction: row;
        align-items: baseline;
    }
</style>
