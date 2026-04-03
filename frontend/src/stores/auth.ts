import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
    const loggedIn = ref(false);
    const loggedInUserId = ref(0);

    function setLoggedIn(id: number) {
        loggedIn.value = id > 0;
        loggedInUserId.value = id;
    }

    function isLoggedIn() {
        return loggedIn.value;
    }

    return { loggedIn, loggedInUserId, setLoggedIn, isLoggedIn };
});
