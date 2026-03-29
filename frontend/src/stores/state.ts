import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'

export interface LogEntryData {
    userId: number;
    timestamp: number;
    op: string;
    card: string;
    spindleTime: number;
}

export interface ToolData {
    id: number;
    name: string;
    users: number[];
    log: LogEntryData[];
    currentUserId: number;
    mac: string;
    offline: boolean;
    utilization: number;
    isLocked: boolean;
    spindleTime: number;
    version?: number;
}

export interface UserData {
    id: number;
    fullName: string;
    email: string;
    card: string;
    doorCard: string;
    group: boolean;
    members: number[];
}

export interface PortalUserData {
    id: number;
    name: string;
    password: string;
}


// interface State {
//     users: UserData[];
//     tools: ToolData[];
//     inModal: boolean;
//     updatePending: boolean;
//     loggedIn: boolean;
//     inRefresh: boolean;
// }

export const useStateStore = defineStore('state', () => {
    const users = ref([] as UserData[]);
    const tools = ref([] as ToolData[]);
    const portalUsers = ref([] as PortalUserData[]);
    let updatePending:boolean = false;
    let loggedIn:boolean = false;
    const loggedInUserId = ref(0);
    const loggedInUserName = ref('');
    let inRefresh:boolean = false;

    function findUser(userId:number) {
        return users.value.find((x:UserData) => {
            return (x.id === userId);
        });
    }

    function findPortalUser(userId:number) {
        return portalUsers.value.find((x:PortalUserData) => {
            return (x.id === userId);
        });
    }

    function findTool(toolId:number) {
      return tools.value.find((x:ToolData) => {
          return (x.id === toolId);
      });
    }

    function refreshData() {
        if (inRefresh) {
            console.log('Deferring refresh...');
            updatePending = true;
            return;
        }

        inRefresh = true;

        fetch('/api/users').then(resp => {
            if (resp.ok) {
                resp.json().then(j => {
                    console.log(j);
                    users.value = j.data
                });
            }
        }).catch(e => {
            console.log("Error fetching /api/users: " + e);
        });

        fetch('/api/tools').then(resp => {
            if (resp.ok) {
                resp.json().then(j => {
                    console.log(j);
                    tools.value = j.data
                });
            }
        }).catch(e => {
            console.log("Error fetching /api/tools: " + e);
        });

        fetch('/api/portalusers').then(resp => {
            if (resp.ok) {
                resp.json().then(j => {
                    console.log(j);
                    portalUsers.value = j.data
                });
            }
        }).catch(e => {
            console.log("Error fetching /api/portalusers: " + e);
        });

        inRefresh = false;
    }

    function getUserFullName(userId:number) {
        const user = findUser(userId);
        return user ? user.fullName : "<user not found>";
    }

    function getLogEntryDisplayName(entry:LogEntryData) {
        const user = findUser(entry.userId);

        return user ? user.fullName : "Card #" + entry.card;
    }

    async function editUser(user:UserData) {
        console.log("editUser: " + user.fullName + ", " + user.email + ", " + user.card + ", " + user.doorCard);
        const resp = await fetch(`/api/user/edit`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({id: user.id, name: user.fullName, email: user.email, card: user.card, doorCard: user.doorCard, members: user.members})
        });
        const respJson = await resp.json();
        return (resp.status === 200 && !respJson.error);
    }

    async function addUser(user:UserData) {
        console.log("addUser: " + user.fullName + ", " + user.email + ", " + user.card + ", " + user.doorCard);
        const resp = await fetch('/api/user/add', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({name: user.fullName, email: user.email, card: user.card, doorCard: user.doorCard, members: user.group ? user.members : undefined})
        });
        const respJson = await resp.json();
        return (resp.status === 200 && !respJson.error);
    }

    async function deleteUser(userId:number) {
        const resp = await fetch('/api/user/delete', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({id: userId})
        });
        const respJson = await resp.json();
        return (resp.status === 200 && !respJson.error);
    }

    async function editPortalUser(userId:number, name:string, newPass:string) {
        console.log("editPortalUser: " + name);
        const resp = await fetch(`/api/portaluser/edit`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({id: userId, name: name, password: newPass})
        });
        const respJson = await resp.json();
        return (resp.status === 200 && !respJson.error);
    }

    async function addPortalUser(name:string, pass:string) {
        console.log("addPortalUser: " + name);
        const resp = await fetch('/api/portaluser/add', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({name: name, password: pass})
        });
        const respJson = await resp.json();
        return (resp.status === 200 && !respJson.error);
    }

    async function deletePortalUser(userId:number) {
        const resp = await fetch('/api/portaluser/delete', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({id: userId})
        });
        const respJson = await resp.json();
        return (resp.status === 200 && !respJson.error);
    }

    async function setToolLockout(toolId:number, lockout:boolean) {
        const resp = await fetch('/api/tool/setlockout', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: toolId, islocked: lockout})
        });
        const respJson = await resp.json();
        return (resp.status === 200 && !respJson.error);
    }

    async function editToolUsers(toolId:number, newUsers:number[]) {
      const resp = await fetch(`/api/tool/edit`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({toolId: toolId, toolUsers: newUsers})
      });
      const respJson = await resp.json();
      return (resp.status === 200 && !respJson.error);
    }


    async function editToolName(toolId:number, newName:string) {
      const resp = await fetch(`/api/tool/edit`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({toolId: toolId, toolName: newName})
      });
      const respJson = await resp.json();
      return (resp.status === 200 && !respJson.error);
    }


    function formatSeconds(totalSeconds:number) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formattedHours = String(hours).padStart(2, '0');
      const formattedMinutes = String(minutes).padStart(2, '0');
      const formattedSeconds = String(seconds).padStart(2, '0');

      return `${formattedHours}h ${formattedMinutes}m ${formattedSeconds}s`;
    }

    async function login(user:string, pass:string) {
        const resp = await fetch(`/api/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({user: user, password: pass})
        });
        const respJson = await resp.json();
        return (resp.status === 200 && !respJson.error && respJson.data && respJson.data.id) ? respJson.data.id : 0;
    }

    function setLoggedIn(b:boolean) {
        loggedIn = b ? true : false;
    }

    function setLoggedInUser(id:number) {
        loggedInUserId.value = id;
    }

    function isLoggedIn() {
        return loggedIn;
    }

    function getPortalUsername(id:number) {
        if (loggedIn) {
          const user = findPortalUser(id);
          if (user) {
            return user.name;
          }
        }

        return "";
    }

    function logout() {
        return fetch(`/api/logout`).then(() => {
            setLoggedIn(false);
            refreshData();
        });
    }

    async function getToolTopUsers(toolId:number) {
        const resp = await fetch(`/api/tools/topusers`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({toolId: toolId})
        });
        const respJson = await resp.json();
        return (resp.status === 200 && !respJson.error) ? respJson.data : [];
    }

    async function getUserTopTools(userId:number) {
        const resp = await fetch(`/api/users/toptools`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({userId: userId})
        });
        const respJson = await resp.json();
        return (resp.status === 200 && !respJson.error) ? respJson.data : [];
    }


    return {users, tools, portalUsers, updatePending, inRefresh, loggedInUserId, loggedInUserName,
      refreshData, getUserFullName, getLogEntryDisplayName,
      findTool, findUser, editUser, addUser, setToolLockout,
      editToolUsers, formatSeconds, editToolName, login,
      setLoggedIn, isLoggedIn, logout, getToolTopUsers, getUserTopTools, deleteUser,
      findPortalUser, addPortalUser, editPortalUser, deletePortalUser,
      setLoggedInUser, getPortalUsername};
});

// ,
//     getters: {

//         getUsers():UserData[] {
//             return this.users;
//         },

//         findUser(userId:number):UserData|undefined {
//             return this.users.find((x:UserData) => {x.id === userId});
//         }
//     },
//     actions: {
//         // refreshData():void {
//         //     if (this.inModal || this.inRefresh) {
//         //         console.log('Deferring refresh...');
//         //         this.updatePending = true;
//         //         return;
//         //       }

//         //       this.inRefresh = true;

//         //       fetch('/api/users').then(resp => {
//         //         if (resp.ok) {
//         //           resp.json().then(j => {
//         //             console.log(j);
//         //             this.users = j.data
//         //           });
//         //         }
//         //       }).catch(e => {
//         //         console.log("Error fetching /api/users: " + e);
//         //       });

//         //       fetch('/api/tools').then(resp => {
//         //         if (resp.ok) {
//         //           resp.json().then(j => {
//         //             console.log(j);
//         //             this.tools = j.data
//         //           });
//         //         }
//         //       }).catch(e => {
//         //         console.log("Error fetching /api/tools: " + e);
//         //       });

//         //       this.inRefresh = false;
//         // },

//         enterModal():boolean {
//             if (this.inModal) {
//                 return false;
//             }

//             this.inModal = true;
//             return true;
//         },

//         foo():string {
//             return "foo"
//         },

//         exitModal() {
//             if (!this.inModal) {
//                 console.log("!!!Modal State Mismatch");
//             }

//             this.inModal = false;

//             if (this.updatePending) {
//                 this.updatePending = false;
//                 this.foo();
//                 //refreshData();
//             }
//         },

//         // async login(user:string, pass:string) {
//         //     let resp = await fetch(`/api/login`, {
//         //     method: 'POST',
//         //     headers: {'Content-Type': 'application/json'},
//         //     body: JSON.stringify({user: user, password: pass})
//         //     });
//         //     let respJson = await resp.json();
//         //     return (resp.status === 200 && !respJson.error);
//         // },
//         // async logout() {
//         //     await fetch(`/api/logout`);
//         // },
//         // async changeAdminPass(oldPass:string, newPass:string) {
//         //     let resp = await fetch(`/api/changePassword`, {
//         //     method: 'POST',
//         //     headers: {'Content-Type': 'application/json'},
//         //     body: JSON.stringify({oldPass: oldPass, newPass: newPass})
//         //     });
//         //     let respJson = await resp.json();
//         //     return (resp.status === 200 && !respJson.error);
//         // },
//         // setLoggedIn(b:boolean) {
//         //     this.loggedIn = b;
//         // },
//         // isLoggedIn() {
//         //     return this.loggedIn;
//         // },
//         // getUserFullName(userId:string) {
//         //     let user = this.findUser(userId);
//         //     return user ? user.fullName : "<user not found>";
//         // },
//         // getLogEntryDisplayName(entry) {
//         //     let user = this.$data.shared.findUser(entry.userId);

//         //     return user ? user.fullName : "Card #" + entry.card;
//         // },
//         // async editTool(tool, newName) {
//         //     let resp = await fetch(`/api/tool/edit`, {
//         //     method: 'POST',
//         //     headers: {'Content-Type': 'application/json'},
//         //     body: JSON.stringify({toolId: tool.id, toolName: newName})
//         //     });
//         //     let respJson = await resp.json();
//         //     return (resp.status === 200 && !respJson.error);
//         // },
//         // async editToolUsers(tool, newUsers) {
//         //     let resp = await fetch(`/api/tool/edit`, {
//         //     method: 'POST',
//         //     headers: {'Content-Type': 'application/json'},
//         //     body: JSON.stringify({toolId: tool.id, toolUsers: newUsers})
//         //     });
//         //     let respJson = await resp.json();
//         //     return (resp.status === 200 && !respJson.error);
//         // },
//         // async addUser(name, email, card, doorCard, members) {
//         //     console.log("addUser: " + name + ", " + email + ", " + card + ", " + doorCard);
//         //     let resp = await fetch(`/api/user/add`, {
//         //     method: 'POST',
//         //     headers: {'Content-Type': 'application/json'},
//         //     body: JSON.stringify({name: name, email: email, card: card, doorCard: doorCard, members: members})
//         //     });
//         //     let respJson = await resp.json();
//         //     return (resp.status === 200 && !respJson.error);
//         // },
//         // async editUser(userId, name, email, card, doorCard, members) {
//         //     console.log("editUser: " + name + ", " + email + ", " + card + ", " + doorCard);
//         //     let resp = await fetch(`/api/user/edit`, {
//         //     method: 'POST',
//         //     headers: {'Content-Type': 'application/json'},
//         //     body: JSON.stringify({id: userId, name: name, email: email, card: card, doorCard: doorCard, members: members})
//         //     });
//         //     let respJson = await resp.json();
//         //     return (resp.status === 200 && !respJson.error);
//         // },
//         // async deleteTool(toolId) {
//         //     let resp = await fetch(`/api/tool/delete`, {
//         //     method: 'POST',
//         //     headers: {'Content-Type': 'application/json'},
//         //     body: JSON.stringify({id: toolId})
//         //     });
//         //     let respJson = await resp.json();
//         //     return (resp.status === 200 && !respJson.error);
//         // },
//         // async deleteUser(userId) {
//         //     let resp = await fetch(`/api/user/delete`, {
//         //     method: 'POST',
//         //     headers: {'Content-Type': 'application/json'},
//         //     body: JSON.stringify({id: userId})
//         //     });
//         //     let respJson = await resp.json();
//         //     return (resp.status === 200 && respJson.error === null);
//         // },
//         // async setToolLockout(toolId, lockout) {
//         //     let resp = await fetch(`/api/tool/setlockout`, {
//         //     method: 'POST',
//         //     headers: {'Content-Type': 'application/json'},
//         //     body: JSON.stringify({id: toolId, islocked: lockout})
//         //     });
//         //     let respJson = await resp.json();
//         //     return (resp.status === 200 && !respJson.error);
//         // },
//     },
// })

