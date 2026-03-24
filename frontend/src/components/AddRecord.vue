<template>
  <form class="record-form" @submit.prevent="submitRecord">
    <div class="record-header">
      <h3 :class="type">{{ title }}</h3>
      <span :class="['type-chip', type]">{{ title }}</span>
    </div>

    <section class="top-row">
      <label class="field">
        <span>Date</span>
        <input v-model="date" type="date" />
      </label>

      <label class="field">
        <span>Time</span>
        <input v-model="time" type="time" />
      </label>
    </section>

    <label class="field">
      <span>Amount *</span>
      <input v-model="amount" type="number" min="0" step="0.01" placeholder="0.00" @input="amountError = ''" />
      <small v-if="amountError" class="field-error">{{ amountError }}</small>
    </label>

    <label class="field">
      <span>Contact (Customer/Supplier)</span>
      <input v-model.trim="contact" type="text" placeholder="Optional contact" />
    </label>

    <label class="field">
      <span>Remark</span>
      <input v-model.trim="remark" type="text" placeholder="Write remark" />
    </label>

    <label class="field">
      <span>Category</span>
      <input v-model.trim="category" type="text" placeholder="Category" />
    </label>

    <label class="field">
      <span>Attachment (Image or PDF)</span>
      <input type="file" accept="image/*,.pdf,application/pdf" @change="onAttachmentChange" />
      <small v-if="attachmentName" class="field-note">Selected: {{ attachmentName }}</small>
      <small v-if="attachmentError" class="field-error">{{ attachmentError }}</small>
    </label>

    <section class="field">
      <span>Payment Mode</span>
      <div class="mode-row">
        <button
          v-for="mode in paymentModes"
          :key="mode"
          class="mode-chip"
          :class="{ active: paymentMode === mode }"
          type="button"
          @click="paymentMode = mode"
        >
          {{ mode }}
        </button>
      </div>
    </section>

    <button :class="['submit-button', type]" type="submit">Save</button>
  </form>
</template>

<script setup>
import { computed, ref } from 'vue'
import { saveAttachmentBlob } from '../lib/attachments'

const props = defineProps({
  type: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['submit'])

const amount = ref('')
const contact = ref('')
const remark = ref('')
const category = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const time = ref(new Date().toTimeString().slice(0, 5))
const paymentMode = ref('Cash')
const amountError = ref('')
const attachmentError = ref('')
const attachmentName = ref('')
const attachmentFile = ref(null)
const paymentModes = ['Cash', 'Online', 'Bank']

const title = computed(() => (props.type === 'income' ? 'Add Cash In Entry' : 'Add Cash Out Entry'))

async function submitRecord() {
  const numericAmount = Number(amount.value)
  if (!numericAmount || numericAmount <= 0) {
    amountError.value = 'Enter an amount greater than zero'
    return
  }

  let attachments = []
  if (attachmentFile.value) {
    const file = attachmentFile.value
    if (file.size > 3 * 1024 * 1024) {
      attachmentError.value = 'Attachment must be below 3MB'
      return
    }

    try {
      const attachmentId = await saveAttachmentBlob(file)
      attachments = [
        {
          id: attachmentId,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          storage: 'indexeddb',
        },
      ]
    } catch {
      attachmentError.value = 'Could not save attachment'
      return
    }
  }

  emit('submit', {
    type: props.type,
    amount: numericAmount,
    note: remark.value,
    contact: contact.value,
    category: category.value,
    paymentMode: paymentMode.value,
    date: date.value,
    time: time.value,
    attachments,
  })
}

function onAttachmentChange(event) {
  const file = event.target.files?.[0]
  attachmentFile.value = file || null
  attachmentName.value = file?.name || ''
  attachmentError.value = ''
}
</script>

<style scoped>
.record-form {
  display: grid;
  gap: 0.8rem;
  padding: 0.85rem;
  border-radius: 14px;
  background: rgba(255, 252, 246, 0.95);
  border: 1px solid rgba(101, 83, 40, 0.12);
}

.record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.record-header h3,
.field,
.field span {
  margin: 0;
}

.record-header h3 {
  font-size: 0.95rem;
}

.record-header h3.income {
  color: #167a3f;
}

.record-header h3.expense {
  color: #b03226;
}

.type-chip {
  padding: 0.26rem 0.52rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
}

.type-chip.income {
  background: #dcfce7;
  color: #166534;
}

.type-chip.expense {
  background: #fee2e2;
  color: #991b1b;
}

.field {
  display: grid;
  gap: 0.35rem;
}

.field span {
  font-weight: 600;
  font-size: 0.78rem;
  color: #4a4f61;
}

.field-error {
  color: #b03226;
  font-size: 0.72rem;
  font-weight: 700;
}

.field-note {
  color: #4a4f61;
  font-size: 0.72rem;
  font-weight: 600;
}

.top-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.field input {
  padding: 0.7rem 0.76rem;
  border-radius: 10px;
  border: 1px solid #d7c8a4;
  background: #fffdfa;
  font-size: 0.86rem;
}

.mode-row {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.mode-chip {
  border: 1px solid #d7c8a4;
  border-radius: 999px;
  padding: 0.42rem 0.62rem;
  background: #fffdfa;
  color: #4a4f61;
  font-size: 0.78rem;
  font-weight: 700;
}

.mode-chip.active {
  border-color: #4d65d8;
  background: rgba(88, 118, 255, 0.14);
  color: #2f47ba;
}

.submit-button {
  border: 0;
  border-radius: 10px;
  padding: 0.7rem 0.8rem;
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
}

.submit-button.income {
  background: linear-gradient(135deg, #17914b, #136636);
}

.submit-button.expense {
  background: linear-gradient(135deg, #d8573c, #9f2f1e);
}
</style>
