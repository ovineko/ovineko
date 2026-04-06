# Philosophy

## A quiet guardian at the threshold

There's a particular kind of pain — when you realize you're solving a problem you've already solved. Not just similar. The exact same one. And once again you spend days trying to remember the nuances that once came with difficulty.

How to properly set up Fastify with Prometheus on a separate port, with a healthcheck that doesn't turn green until you allow it, with tracing that doesn't break types, with Swagger generated from the same types that validate requests. It's not complicated. But there are dozens of small decisions, each of which needs to be made anew — if you didn't write it down.

Or chunk load errors in SPAs. Seems simple — just reload the page. But behind this stands: when to reload, how to bypass cache, how many times to retry, what to show the user during attempts, where to send error reports, how not to spam reports during normal retry. Months of production observations before all this crystallizes into a working solution.

**ovineko exists so these solutions don't get lost.**

Not in notes you won't find. Not in an old project that no longer runs. Not in your head that forgets. Here — as code that works, is tested, and connects with one line.

## Why a monorepo?

The monorepo isn't an architectural decision. It's a psychological trick.

When all libraries live together in one repository, they're constantly visible. Updating dependencies — you see them all. Starting a new project — they're already nearby. Whether you want to or not — you maintain them.

The tools here are opinionated intentionally. Not because other opinions don't matter — but because the goal isn't a universal solution. The goal is to remove the distance between "I want to try an idea" and "it already works as needed." When everything is configured the way you need it, with one function — you can think about the idea, not the configuration.

## The name

The name reflects this in three words from different languages.

**Ovi** is both _ovis_ (sheep/ram in Latin — hence the horns in the logo) and _ovi_ (door in Finnish). A ram is stubborn, steadfast, immovable. A door is the threshold between intention and implementation, between "I want to try" and "it already works."

**Neko** is cat in Japanese. A creature that chooses a place and stays. Doesn't leave when it gets difficult, doesn't disappear when it stops being interesting.

Together — a stubborn ram-cat in a doorway. Not going anywhere.

_A quiet guardian at the threshold. It doesn't move, it doesn't disappear. It simply stays._

## Not for everyone

This is a personal monorepo reflecting specific workflows and preferences. The packages here aren't designed to please everyone.

If these opinions align with your needs — great! If not, these packages might not be the right fit, and that's perfectly fine. Forks are encouraged for different approaches.

The goal is to consolidate proven solutions, maintain consistency, and iterate faster. Update once, benefit everywhere.
