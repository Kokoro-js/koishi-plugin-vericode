import { Context, Dict, Schema } from 'koishi'

export const name = 'vericode'

export interface Config {
  groups: Array<string>
}

export const Config: Schema<Config> = Schema.object({
  groups: Schema.array(String).role('table'),
})

export function apply(ctx: Context, config: Config) {
  ctx.on('guild-member-added', async (member) => {
    if (!config.groups.includes(member.guildId)) return
    
  })
}
