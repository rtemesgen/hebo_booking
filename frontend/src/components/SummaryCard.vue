<template>
  <section class="summary-card">
    <div>
      <p class="label">Cash In</p>
      <strong class="income">{{ formatCurrency(cashIn) }}</strong>
    </div>

    <div>
      <p class="label">Cash Out</p>
      <strong class="expense">{{ formatCurrency(cashOut) }}</strong>
    </div>

    <div>
      <p class="label">Balance</p>
      <strong class="balance">{{ formatCurrency(balance) }}</strong>
    </div>
  </section>
</template>

<script setup>
defineProps({
  cashIn: {
    type: Number,
    required: true,
  },
  cashOut: {
    type: Number,
    required: true,
  },
  balance: {
    type: Number,
    required: true,
  },
})

function formatCurrency(value) {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(value)
}
</script>

<style scoped>
.summary-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  padding: 0.68rem 0.75rem;
  border-radius: 18px;
  color: #fffaf1;
  background: linear-gradient(135deg, #193d2c, #27553a 60%, #3c6f4e);
  box-shadow: 0 12px 22px rgba(16, 52, 35, 0.22);
}

.label {
  margin: 0 0 0.15rem;
  color: rgba(255, 248, 234, 0.8);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.summary-card strong {
  font-size: 0.92rem;
}

.income,
.expense,
.balance {
  color: #fffaf1;
}

</style>
