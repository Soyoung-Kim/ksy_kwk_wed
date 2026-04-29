export const APP_CONFIG = {
  supabaseUrl: 'https://kagzenniuseexohgoggv.supabase.co',
  supabasePublishableKey: 'sb_publishable_dTkmvxrDFeRSPp5keks-ag_bU15zkY3',

  weddingIso: '2026-11-08T11:30:00+09:00',
  coupleLabel: '소영 ❤ 우경',

  guestbook: {
    table: 'guestbook_entries',
    groomName: '우경',
    brideName: '소영',
    functions: {
      create: 'guestbook-create',
      update: 'guestbook-update',
      delete: 'guestbook-delete',
      aiSuggest: 'guestbook-ai'
    }
  }
};
