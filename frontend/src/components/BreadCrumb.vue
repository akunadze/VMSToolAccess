<script setup lang="ts">
import { useRoute } from 'vue-router';
import { ref, watch } from 'vue';
import { useStateStore } from '@/stores/state';

const myState = useStateStore();
const route = useRoute();

const breadcrumbs = ref(getBreadcrumbs());

watch(() => route.path, () => {
  breadcrumbs.value = getBreadcrumbs();
});

function getBreadcrumbs() {
  const matched = route.matched;
  const crumbs = [{ label: '<i class="bi bi-house-door" style="font-size: 1.5rem;"></i>', to: '/' }];

  for (let i = 0; i < matched.length; i++) {
    const match = matched[i];
    const breadcrumb = match.meta.breadcrumb;

    if (breadcrumb && match.path !== '/') {
      let label;
      let to;
      if (typeof breadcrumb === 'function') {
        const result = breadcrumb(route, myState);
        label = result.label;
        to = result.to;
      } else if (typeof breadcrumb === 'object' && breadcrumb !== null && 'label' in breadcrumb && 'to' in breadcrumb) {
        label = (breadcrumb as { label: string; to: string }).label;
        to = (breadcrumb as { label: string; to: string }).to;
      }

      if (i > 0 && matched[i].path === matched[i-1].path) {
        // Skip if the path is the same as the previous one
        continue;
      }

      crumbs.push({ label: label, to: to });
    }
  }

  crumbs[crumbs.length - 1].to = '';

  return crumbs;
}

</script>

<template>
  <nav class="breadcrumb" style="--bs-breadcrumb-divider: '>';" aria-label="breadcrumb">
    <ol class="breadcrumb align-items-center">
      <li class="breadcrumb-item" v-for="(crumb, index) in breadcrumbs" :key="index">
        <router-link v-if="crumb.to" :to="crumb.to"><span v-html="crumb.label"></span></router-link>
        <span v-else v-html="crumb.label"></span>
      </li>
    </ol>
  </nav>
</template>

