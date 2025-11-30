const SALES_CHANNELS = {
  TIKTOK: 'tiktok',
  SHOPEE: 'shopee',
  LAZADA: 'lazada',
  FACEBOOK: 'facebook',
  OTHER: 'other'
};

const SALES_CHANNEL_LABELS = {
  [SALES_CHANNELS.TIKTOK]: 'TikTok',
  [SALES_CHANNELS.SHOPEE]: 'Shopee',
  [SALES_CHANNELS.LAZADA]: 'Lazada',
  [SALES_CHANNELS.FACEBOOK]: 'Facebook',
  [SALES_CHANNELS.OTHER]: 'Khác'
};

const SALES_CHANNEL_OPTIONS = [
  { value: SALES_CHANNELS.TIKTOK, label: SALES_CHANNEL_LABELS[SALES_CHANNELS.TIKTOK] },
  { value: SALES_CHANNELS.SHOPEE, label: SALES_CHANNEL_LABELS[SALES_CHANNELS.SHOPEE] },
  { value: SALES_CHANNELS.LAZADA, label: SALES_CHANNEL_LABELS[SALES_CHANNELS.LAZADA] },
  { value: SALES_CHANNELS.FACEBOOK, label: SALES_CHANNEL_LABELS[SALES_CHANNELS.FACEBOOK] },
  { value: SALES_CHANNELS.OTHER, label: SALES_CHANNEL_LABELS[SALES_CHANNELS.OTHER] }
];

const getSalesChannelLabel = (channel) => {
  return SALES_CHANNEL_LABELS[channel] || channel || 'Chưa chọn';
};

const getSalesChannelBadgeColor = (channel) => {
  const colors = {
    [SALES_CHANNELS.TIKTOK]: 'bg-black text-white',
    [SALES_CHANNELS.SHOPEE]: 'bg-orange-100 text-orange-800 border-orange-200',
    [SALES_CHANNELS.LAZADA]: 'bg-blue-100 text-blue-800 border-blue-200',
    [SALES_CHANNELS.FACEBOOK]: 'bg-blue-100 text-blue-800 border-blue-200',
    [SALES_CHANNELS.OTHER]: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[channel] || 'bg-gray-100 text-gray-800 border-gray-200';
};

module.exports = {
  SALES_CHANNELS,
  SALES_CHANNEL_LABELS,
  SALES_CHANNEL_OPTIONS,
  getSalesChannelLabel,
  getSalesChannelBadgeColor
};

