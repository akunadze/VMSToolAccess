<template>
<!--
        <div v-for="i in [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]" v-bind:key="i">Test<br></div>
-->
  <div class="d-flex flex-grow-1 no-minh">
    <b-col cols="4" class="d-flex flex-grow-1 pt-2 px-1 no-minh">
        <div class="p-0 m-0 d-flex flex-grow-1 flex-column border rounded no-minh" style="overflow-y: auto; height:100%">

        <b-list-group id="userList" class="list-group-flush d-flex flex-grow-1 mb-2 no-minh" role="tablist">
            <b-list-group-item button data-toggle="list" role="tab"
                v-for="user in this.$root.$data.shared.getUsers()" 
                v-bind:key="user.id" 
                v-on:click="onUserClick(user)"
                :active="selectedUser == user"
            >
                {{user.fullName}}
            </b-list-group-item>
            <b-list-group-item button v-if="newUser" :active="selectedUser == newUser">
                New User
            </b-list-group-item>
            <b-list-group-item button class="text-center" @click="addUser">
                Add new user
            </b-list-group-item>
        </b-list-group>
        </div>
    </b-col>
    <b-col cols="8" class="d-flex flex-grow-1 flex-column px-1" v-if="selectedUser">
        <b-form class="border rounded flex-grow-1 ml-2 mt-2 p-2">
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
            <b-form-group id="card-group" label="Card ID:" label-for="card-field">
                <b-form-input
                    id="card-field"
                    v-model="card"
                    placeholder="Enter or scan card ID"
                    required
                    @focus="cardFocused = true"
                    @blur="cardFocused = false"
                    @input="onInput()"
                ></b-form-input>
            </b-form-group>
            
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
    onUserClick(x) {
        this.promptChange().then(() => {
            if (this.newUser) {
                this.newUser = null;
            }
            this.selectUser(x);
        })
    },
    selectUser(x) {
        this.fullName = x ? x.fullName : "";
        this.email = x ? x.email : "";
        this.card = x ? x.card : "";
        this.selectedUser = x;
        this.changed = false;
    },
    addUser() {
        this.promptChange().then(() => {
            this.newUser = {fulleName: "", email: "", card: ""};
            this.selectUser(this.newUser);
        });
    },
    onReset() {
        this.selectUser(this.selectedUser);
    },
    onDelete() {
        if (this.selectedUser && this.selectedUser != this.newUser) {
            this.$root.deleteUser(this.selectedUser.id);
        }
    },
    onSubmit() {
        if (this.newUser && this.newUser == this.selectedUser) {
            this.$root.addUser(this.fullName, this.email, this.card).then(() => {
                this.newUser = null;
                this.selectUser(null); 
            });
        } else {
            this.$root.editUser(this.selectedUser.id, this.fullName, this.email, this.card).then(() => {
                this.selectUser(null);
            })
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
