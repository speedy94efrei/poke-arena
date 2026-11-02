/**
 * Comptes Arène : le pseudo d'un compte est réservé à son propriétaire. Le site le prouve par un jeton à usage unique
 * de l'API (/compte connexion <jeton>) et le serveur le connecte alors sous le pseudo du compte, comme un compte
 * enregistré de Showdown (un invité qui occupait ce pseudo repasse en invité). Personne d'autre ne peut prendre ce
 * pseudo avec /trn. La liste des pseudos protégés vient de l'API et se rafraîchit chaque minute.
 * Sans ARENE_API_URL ni ARENE_API_SECRET, rien n'est protégé : n'importe quel pseudo libre est accepté.
 */
import { Arene, Drafts } from './pokedraft';
import { Training } from './entrainement';

const REFRESH_DELAY = 60_000;

export const Accounts = new class {
	names = new Set<ID>();
	timer: NodeJS.Timeout | null = null;

	start() {
		if (!Arene.enabled || this.timer) return;
		void this.refresh();
		this.timer = setInterval(() => void this.refresh(), REFRESH_DELAY);
	}

	stop() {
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
	}

	async refresh() {
		try {
			const data = await Arene.request<{ showdown_ids: string[] }>('GET', '/protected-names');
			this.names = new Set(data.showdown_ids.map(id => toID(id)));
		} catch (error) {
			Monitor.warn(`Pseudos des comptes non chargés : ${(error as Error).message}`);
		}
	}

	isProtected(name: string) {
		return this.names.has(toID(name));
	}

	/** Jeton du site → compte prouvé : le joueur prend le pseudo du compte et peut jouer en classé. */
	async login(user: User, token: string) {
		if (!Arene.enabled) throw new Chat.ErrorMessage("Les comptes Arène ne sont pas reliés à ce serveur de combat.");
		const account = await Arene.request<{ name: string, showdown_id: string }>('POST', '/showdown-sessions', { token });
		const id = toID(account.name);
		if (Training.isReserved(account.name)) throw new Chat.ErrorMessage('Ce pseudo est réservé aux bots du serveur.');
		this.names.add(id);
		if (user.handleRename(account.name, id, false, '2') === false || user.id !== id) return;
		Drafts.verified.set(user.id, account.name);
		// Un compte Arène vaut un compte confirmé de Showdown : il peut envoyer et recevoir des messages privés.
		user.autoconfirmed = user.id;
		Drafts.send(user.id, { type: 'account', ranked: true, verified: true, name: account.name });
	}
};

export const commands: Chat.ChatCommands = {
	compte: {
		async connexion(target, room, user) {
			const token = target.trim();
			if (!token) return this.parse('/help compte');
			try {
				await Accounts.login(user, token);
			} catch (error) {
				const message = error instanceof Chat.ErrorMessage ? error.message : (error as Error).message;
				user.send(`|nametaken||Connexion au compte impossible : ${message}`);
			}
		},
	},
	comptehelp: [`/compte connexion [jeton] - Te connecte sous le pseudo de ton compte Arène, avec un jeton à usage unique de l'API.`],
};

export const namefilter: Chat.NameFilter = (name, user) => (
	Accounts.isProtected(name) && !(user.registered && user.id === toID(name)) ? '' : name
);

export const destroy = () => Accounts.stop();

Accounts.start();
