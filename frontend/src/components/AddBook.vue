<template>
  <form class="add-book-card" @submit.prevent="submitBook">
    <div class="add-book-copy">
      <p class="eyebrow">Create a book</p>
      <h3>Add a new cash book</h3>
      <p>Keep each company book separate so totals stay clean and easy to review.</p>
    </div>

    <label class="field">
      <span>Book name</span>
      <input v-model.trim="name" type="text" placeholder="Example: Branch A Book" />
    </label>

    <button class="primary-button" type="submit">Add Book</button>
  </form>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['submit'])

const name = ref('')

function submitBook() {
  if (!name.value) {
    return
  }

  emit('submit', { name: name.value })
  name.value = ''
}
</script>

<style scoped>
.add-book-card {
  display: grid;
  gap: 1rem;
  padding: 1.2rem;
  border-radius: 24px;
  background: rgba(255, 252, 244, 0.9);
  border: 1px solid rgba(101, 83, 40, 0.12);
  box-shadow: 0 18px 45px rgba(82, 61, 20, 0.09);
}

.add-book-copy h3,
.add-book-copy p,
.field,
.field span {
  margin: 0;
}

.eyebrow {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #916f22;
  margin: 0 0 0.35rem;
}

.field {
  display: grid;
  gap: 0.45rem;
}

.field span {
  font-weight: 600;
}

.field input {
  padding: 0.9rem 1rem;
  border: 1px solid #d7c8a4;
  border-radius: 14px;
  background: #fffdfa;
}

.primary-button {
  border: 0;
  border-radius: 14px;
  padding: 0.95rem 1rem;
  color: #fff8ea;
  background: linear-gradient(135deg, #1f7a45, #14532d);
  font-weight: 700;
}
</style>
