let linking = false

/**
 * Relie le compte Arène au pseudo du serveur de combat quand les deux correspondent, pour jouer en classé.
 */
export function useRankedLink() {
  const { store: showdown } = useShowdown()
  const { store: draft, refresh, link, unlink } = useDraft()
  const { session, showdownToken } = useAccount()

  watch(() => showdown.status, (status) => {
    if (status === 'connecte') refresh()
  })

  watch(() => [draft.account.ranked, draft.account.verified, showdown.name, session.value.name] as const, async ([ranked, verified, name, accountName]) => {
    if (verified && (!accountName || showdownId(name) !== showdownId(accountName))) {
      unlink()
      return
    }
    if (!ranked || verified || linking || !accountName || showdownId(name) !== showdownId(accountName)) return
    linking = true
    try {
      link(await showdownToken())
    } catch {
      return
    } finally {
      linking = false
    }
  })
}
