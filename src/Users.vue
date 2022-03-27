<template>
<!--
        <div v-for="i in [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]" v-bind:key="i">Test<br></div>
-->
  <div class="d-flex flex-grow-1 no-minh">
    <b-col cols="4" class="d-flex flex-column flex-grow-1 pt-2 px-1 no-minh">
        <div class="p-0 m-0 d-flex flex-grow-1 flex-column border rounded no-minh" style="overflow-y: auto; height:100%">

        <b-list-group id="userList" class="list-group-flush d-flex flex-grow-1 mb-2 no-minh" role="tablist">
            <b-list-group-item button data-toggle="list" role="tab"
                v-for="user in this.$root.$data.shared.getUsers()" 
                v-bind:key="user.id" 
                v-on:click="onUserClick(user)"
                :active="selectedUser == user"
            >
                {{user.group ? "{ " + user.fullName + " }" : user.fullName}}
            </b-list-group-item>
            <b-list-group-item button v-if="newUser" :active="selectedUser == newUser">
                {{newUser.group ? "{ New Group }" : "New User"}}
            </b-list-group-item>
            <b-list-group-item button class="text-center" @click="addUser" v-if="!selectedUser || (selectedUser != newUser || selectedUser.group)">
                Add new user
            </b-list-group-item>
            <b-list-group-item button class="text-center" @click="addGroup" v-if="!selectedUser || (selectedUser != newUser || !selectedUser.group)">
                Add new group
            </b-list-group-item>
        </b-list-group>
        </div>
        <div class="d-flex mt-2">
                <b-button class="mr-2" type="submit" variant="outline-primary" @click.prevent="addUser">Add User</b-button>
                <b-button class="" type="reset" variant="outline-primary" @click.prevent="addGroup">Add Group</b-button>
        </div>
    </b-col>
    <b-col cols="8" class="d-flex flex-grow-1 flex-column px-1" v-if="selectedUser">
        <b-form class="border rounded flex-grow-1 ml-2 mt-2 p-2" v-if="!selectedUser.group">
            <b-form-group id="name-group" label="Full Name:" label-for="name-field">
                <b-form-input
                    id="name-field"
                    v-model="fullName"
                    placeholder="Enter name"
                    required
                    @input="onInput()"
                ></b-form-input>
            </b-form-group>            
            <b-form-group id="email-group" label="Email:" label-for="email-field">
                <b-form-input
                    id="email-field"
                    v-model="email"
                    type="email"
                    placeholder="Enter email address"
                    @input="onInput()"
                ></b-form-input>
            </b-form-group>            
            <b-form-group id="card-group" label="Tool Card ID:" label-for="card-field">
                <b-form-input
                    id="card-field"
                    v-model="card"
                    placeholder="Enter or scan tool card ID"
                    @focus="cardFocused = true"
                    @blur="cardFocused = false"
                    @input="onInput()"
                ></b-form-input>
            </b-form-group>
            <b-form-group id="door-card-group" label="Door Card ID:" label-for="door-card-field">
                <b-form-input
                    id="door-card-field"
                    v-model="doorCard"
                    placeholder="Enter door card ID"
                    @input="onInput()"
                ></b-form-input>
            </b-form-group>
            
            <div class="d-flex">
                <b-button class="mr-2" type="submit" variant="outline-primary" @click.prevent="onSubmit" :disabled="!this.changed">Submit</b-button>
                <b-button class="" type="reset" variant="outline-danger" @click.prevent="onReset" :disabled="!this.changed">Reset</b-button>        
                <b-button class="ml-auto" variant="outline-danger" @click.prevent="onDelete" v-if="this.selectedUser != this.newUser">Delete</b-button>
            </div>
        </b-form>
        <b-form class="border rounded flex-grow-1 ml-2 mt-2 p-2" v-if="selectedUser.group">
            <b-form-group id="name-group" label="Group Name:" label-for="name-field">
                <b-form-input
                    id="name-field"
                    v-model="fullName"
                    placeholder="Enter name"
                    required
                    @input="onInput()"
                ></b-form-input>
            </b-form-group>            
                <v-multiselect-listbox ref="listbox" class="d-flex mt-2 mb-2"
                    :options="this.$root.$data.shared.users.filter(x => !x.group)"
                    :reduce-display-property="(option) => option.fullName"
                    :reduce-value-property="(option) => option.id"
                    search-options-placeholder="All Users"
                    selected-options-placeholder="Group Users"
                    selected-no-options-text="No users selected"
                    @input="onInput()"
                    >
                </v-multiselect-listbox>
            <div class="d-flex">
                <b-button class="mr-2" type="submit" variant="outline-primary" @click.prevent="onSubmit" :disabled="!this.changed">Submit</b-button>
                <b-button class="" type="reset" variant="outline-danger" @click.prevent="onReset" :disabled="!this.changed">Reset</b-button>        
                <b-button class="ml-auto" variant="outline-danger" @click.prevent="onDelete" v-if="this.selectedUser != this.newUser">Delete</b-button>
            </div>
        </b-form>
    </b-col>
  </div>
</template>

<script>
export default {
  name: 'Users',
  data () {return {
      fullName: "",
      email: "",
      card: "",
      doorCard: "",
      selectedUser: null,
      activeTab: null,
      newUser: null,
      cardFocused: false,
      changed: false
  }},
  methods: {
    onInput() {
        this.changed = true;
    },
    promptChange() {
        if (!this.changed) {
            return new Promise((resolve, reject) => {
                resolve();
            });
        } else {
            return new Promise((resolve, reject) => {
                this.$bvModal.msgBoxConfirm('Changes to ' + this.selectedUser.fullName + ' will be lost. Are you sure?', {
                    title: 'Please Confirm',
                    size: 'md',
                    buttonSize: 'sm',
                    okVariant: 'danger',
                    okTitle: 'Yes',
                    cancelTitle: 'No',
                    footerClass: 'p-2',
                    hideHeaderClose: false,
                    centered: true
                }).then(value => {
                    if (value) {
                        resolve();
                    } else {
                        reject();
                    }
                }).catch(err => {
                    console.log(err);
                    reject();
                })
            });
        }
    },
    isSelectedUser(x) {
        return x;
    },
    isSelectedGroup(x) {
        return x && x.group;
    },
    onUserClick(x) {
        this.promptChange().then(() => {
            if (this.newUser) {
                this.newUser = null;
            }
            this.selectUser(x);
        })
    },
    selectUser(x) {
        this.selectedUser = x;
        this.changed = false;
        this.fullName = x ? x.fullName : "";

        if (x && x.group) {
            this.$nextTick().then(() => {
                this.$refs.listbox.selectedItems = [];

                for (const id of x.members) {
                    const user = this.$root.$data.shared.findUser(id);
                    if (user) {
                        this.$refs.listbox.selectedItems.push(user);
                    }
                }
            });
        } else {
            this.email = x ? x.email : "";
            this.card = x ? x.card : "";
            this.doorCard = x ? x.doorCard : "";
        }
    },
    addUser() {
        this.promptChange().then(() => {
            this.newUser = {fulleName: "", email: "", card: "", doorCard: "", group: 0};
            this.selectUser(this.newUser);
        });
    },
    addGroup() {
        this.promptChange().then(() => {
            this.newUser = {fulleName: "", email: "", card: "", doorCard: "", group: 1};
            this.selectUser(this.newUser);
        });
    },
    onReset() {
        this.selectUser(this.selectedUser);
    },
    onDelete() {
        if (this.selectedUser && this.selectedUser != this.newUser) {
            this.$root.deleteUser(this.selectedUser.id).then(x => {
                if (x) {
                    console.log("delete ok");
                    this.selectUser(null);
                }
            });
        }
    },
    onSubmit() {
        if (this.newUser && this.newUser == this.selectedUser) {
            this.$root.addUser(this.fullName, this.email, this.card, this.doorCard, this.newUser.group ? 
                        this.$refs.listbox.selectedItems.map(x => x.id) : null).then(() => {
                this.newUser = null;
                this.selectUser(null);
            });
        } else {
            this.$root.editUser(this.selectedUser.id, this.fullName, this.email, this.card, this.doorCard, 
                        this.selectedUser.group ? this.$refs.listbox.selectedItems.map(x => x.id) : null).then(() => {
                this.selectUser(null);
            });
        }
    },
    onCardScanned(card) {
        if (this.selectedUser && this.cardFocused) {
            this.card = card;
        }
    }
  },
  mounted() {
      this.$root.$on('card', x => this.onCardScanned(x))
  },
  beforeDestroy() {
    this.$root.$off('card');
  },
  beforeRouteLeave(to, from, next) {
    if (!this.changed) {
        next();
    } else {
        const toPath = to.path;
        this.promptChange().then(() => {
            this.changed = false;
            this.$router.push(toPath);
        });
    }
  }
}
</script>
