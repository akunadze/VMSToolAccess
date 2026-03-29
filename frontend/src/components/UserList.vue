<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    users: any[]
    selectedUsers?: number[]
    includeGroups?: boolean
    useLinks?: boolean
    idField?: string
    nameField?: string
    groupField?: string
    searchFn?: (user: any, search: string) => boolean
    linkFn?: (user: any) => string | undefined
  }>(),
  {
    includeGroups: false,
    useLinks: true
  }
)

const selectedOnly = ref(false)

const search = ref('')

const useSelection = props.selectedUsers != undefined;

const oldSelectedIds = useSelection ? Array.from(props.selectedUsers) : [];
const newSelectedUsers = ref(useSelection ? Array.from(props.selectedUsers) : []);

const modified = computed(() => {
  if (newSelectedUsers.value.length === oldSelectedIds.length) {
    const mod = !newSelectedUsers.value.every(x => oldSelectedIds.includes(x));
    return mod;
  } else {
    return true;
  }
})

defineExpose({
  modified, newSelectedUsers
})

const filteredUsers = computed(() => {
  return props.users.filter((user) => {
    if (!props.includeGroups && user[props.groupField!])
      return false;

    if (useSelection && selectedOnly.value && !newSelectedUsers.value.includes(user[props.idField!])) {
      return false;
    }

    if (search.value.length > 0) {
      if (props.searchFn) {
        return props.searchFn(user, search.value);
      }
      const searchLower = search.value.toLowerCase();
      return user[props.nameField!]?.toLowerCase?.().includes(searchLower);
    } else {
      return true;
    }
  })
})

function userLabel(user: any) {
  return user[props.groupField!] ? `{ ${user[props.nameField!]} }` : user[props.nameField!]
}

function userLink(user: any) {
  if (props.linkFn)
    return props.linkFn(user)
  else
    return ''
}

function toggleSelectedOnly() {
  selectedOnly.value = !selectedOnly.value;
}
</script>

<template>
  <div class="input-group mb-2">
    <input class="form-control" type="search" id="search-field" v-model="search" placeholder="search"/>
    <slot></slot>
    <button class="btn btn-outline-secondary" :aria-pressed="selectedOnly" v-if="useSelection" data-bs-toggle="button" @click="toggleSelectedOnly"><i class="bi bi-check" /></button>
  </div>
  <div class="user-list d-flex flex-grow-1 flex-shrink-1 list-group list-group-flush border rounded overflow-y-scroll mb-2">
    <component
      :is="props.useLinks ? 'RouterLink' : 'div'"
      v-for="user in filteredUsers"
      :key="user[props.idField!]"
      :to="props.useLinks ? userLink(user) : undefined"
      class="list-group-item"
    >
      <input class="form-check-input" type="checkbox" :value="user[props.idField!]" v-model="newSelectedUsers" id="checkDefault" v-if="useSelection">
      {{ userLabel(user) }}
    </component>
  </div>
</template>
