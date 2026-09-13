STAGES = [
    {
        "id": "intent", "title": "Purpose & intent",
        "intro": "Turn the rough idea into a concrete system purpose before discussing architecture.",
        "guidance": "Describe the change you want in the world, not the technology you want to use. Avoid words such as intelligent, autonomous, robust, or scalable unless you define them operationally.",
        "fields": [
            ("idea", "textarea", "What are you trying to make possible?", "State the idea in ordinary language."),
            ("examples", "textarea", "Give three concrete examples of what the system should accomplish.", "Use observable situations, not feature names."),
            ("non_goals", "textarea", "What is explicitly out of scope?", "A good spec says what the system will not do."),
        ],
    },
    {
        "id": "world", "title": "Environment & boundaries",
        "intro": "Define the world the system can observe and affect.",
        "guidance": "Separate what the system can observe from what it may change, and identify the ground-truth source for each important state.",
        "fields": [
            ("environments", "environments", "Where does the system operate?", "Select every environment that matters."),
            ("observations", "textarea", "What can it observe?", "List structured facts, events, files, APIs, metrics, messages, or other signals."),
            ("changes", "textarea", "What can it change?", "List actions and side effects it can cause."),
            ("ground_truth", "textarea", "What sources establish ground truth?", "Name the authoritative sources used to verify important states."),
        ],
    },
    {
        "id": "success", "title": "Success & falsifiability",
        "intro": "Define how an independent system could prove whether the agent succeeded.",
        "guidance": "Do not let the actor grade itself. Prefer deterministic or externally observable evidence: tests, database state, HTTP responses, receipts, deployment hashes, measured outcomes, or human-confirmed results.",
        "fields": [
            ("success_state", "textarea", "What observable state proves success?", "Write a condition that can be checked independently of the model's own claim."),
            ("failure_state", "textarea", "What observable state proves failure?", "Include false-success and partial-success cases."),
            ("verifier", "textarea", "Who or what verifies the outcome?", "Prefer deterministic checks; state when human review is required."),
            ("primary_metric", "text", "What is the primary metric?", "Example: externally verified task-success rate."),
        ],
    },
    {
        "id": "tasks", "title": "Task distribution",
        "intro": "Specify the situations over which you are claiming competence.",
        "guidance": "A capability claim is incomplete without a task distribution. Include routine, difficult, recovery, ambiguous, and stop-or-escalate cases.",
        "fields": [
            ("task_classes", "textarea", "What task classes must the system handle?", "Give classes and representative examples."),
            ("edge_cases", "textarea", "Which edge, recovery, or adversarial cases belong in the evaluation?", "Include ambiguity and repeated failure."),
            ("evaluation_count", "number", "How many distinct evaluation tasks should exist initially?", "Use a representative suite, not one anecdotal demo."),
        ],
    },
    {
        "id": "baseline", "title": "Baseline & hypothesis",
        "intro": "Establish the simplest credible system before adding sophisticated mechanisms.",
        "guidance": "Every extra mechanism must earn its existence. Measure the simplest model + tools + loop first, then test one architectural intervention at a time.",
        "fields": [
            ("baseline", "textarea", "What is the simplest credible baseline?", "Describe the minimum model, tools, and control loop that can attempt the tasks."),
            ("hypothesis", "textarea", "What specific mechanism are you testing?", "Write a falsifiable claim with an expected measurable effect."),
            ("comparison", "textarea", "How will candidate and baseline be compared?", "Keep model, task suite, budgets, and graders fixed unless explicitly studied."),
        ],
    },
    {
        "id": "loop", "title": "Operating loop & cognition",
        "intro": "Define where cognition is needed and where deterministic control should dominate.",
        "guidance": "Use LLM cognition for semantic interpretation or open-ended choice. Keep scheduling, retries, permissions, timeouts, and deterministic state transitions outside the model where possible.",
        "fields": [
            ("operating_loop", "textarea", "Describe one complete observe → decide → act → verify loop.", "Be explicit about each transition."),
            ("llm_decisions", "textarea", "Which decisions require model cognition?", "Do not use an LLM where deterministic code suffices."),
            ("deterministic_control", "textarea", "Which responsibilities must remain deterministic?", "Consider scheduling, retries, limits, permissions, and promotion gates."),
            ("termination", "textarea", "When does a run stop, retry, or escalate?", "Bound retries and define terminal states."),
        ],
    },
    {
        "id": "memory", "title": "State, memory & learning",
        "intro": "Define persistence as explicit engineering mechanisms, not as an ever-growing transcript.",
        "guidance": "Differentiate working state, episodic history, stable facts, verified skills, and architecture history. Define write, retrieval, verification, invalidation, and expiry rules.",
        "fields": [
            ("memory_types", "memory", "What must persist across runs?", "Select only persistence types the system needs."),
            ("write_rules", "textarea", "What writes into durable memory, and when?", "Avoid storing unverified model claims as facts."),
            ("retrieval_rules", "textarea", "How is relevant memory retrieved?", "Assemble context for the decision rather than replaying full history."),
            ("invalidation", "textarea", "How is stale or incorrect memory invalidated?", "Define conflict and expiry behavior."),
        ],
    },
    {
        "id": "risk", "title": "Autonomy, trust & recovery",
        "intro": "Define what the system may do, what requires approval, and what it must never control.",
        "guidance": "Keep evaluators, audit evidence, and promotion rules outside self-modifying boundaries. High-consequence or irreversible actions need explicit policy and recovery semantics.",
        "fields": [
            ("action_classes", "actions", "Which action classes exist?", "Select every class the system may perform."),
            ("approval_policy", "textarea", "Which actions are autonomous, approval-gated, or prohibited?", "State policy by action class."),
            ("trust_boundaries", "textarea", "What must the system not be able to modify or bypass?", "Include graders, audit logs, credentials, policy, or promotion gates where relevant."),
            ("rollback", "textarea", "How are harmful or failed actions recovered or rolled back?", "State what is reversible and what happens when rollback is impossible."),
        ],
    },
    {
        "id": "evaluation", "title": "Evaluation & experiment protocol",
        "intro": "Turn the design into a reproducible experiment.",
        "guidance": "Runs are experiments, not anecdotes. Freeze the suite, repeat stochastic trials, capture traces, and report success, cost, latency, interventions, false-success rate, and failure categories.",
        "fields": [
            ("runs_per_task", "number", "How many repetitions per task?", "Use repeated trials when behavior is stochastic."),
            ("secondary_metrics", "textarea", "Which secondary metrics will be recorded?", "Consider tokens, cost, latency, tool calls, retries, interventions, recovery rate, and false-success rate."),
            ("trace_requirements", "textarea", "What must every execution trace contain?", "Include inputs, context, actions, outputs, errors, state changes, final state, grader result, cost and timing."),
            ("failure_taxonomy", "textarea", "How will failures be classified?", "Separate perception, context, reasoning, planning, tool, execution, verification, memory, recovery, control, specification, and evaluation failures where relevant."),
        ],
    },
    {
        "id": "readiness", "title": "Acceptance & implementation readiness",
        "intro": "Set the conditions that must be satisfied before implementation is promoted or deployed.",
        "guidance": "Completion is not readiness. Critical questions must be resolved, success externally verifiable, failure bounded, and the experiment reproducible.",
        "fields": [
            ("acceptance", "textarea", "What must be true before the implementation is accepted?", "Write measurable acceptance criteria."),
            ("promotion", "textarea", "What evidence is required to promote a candidate architecture?", "Define improvement threshold, regression tolerance, cost limits, and safety gates."),
            ("open_questions", "textarea", "Which open questions remain?", "Unresolved critical questions should block readiness."),
            ("implementation_order", "textarea", "What is the required implementation order?", "Sequence work so evaluators and observability exist before complex autonomy."),
        ],
    },
]

ENV_OPTIONS = ["Local computer", "Repository", "Browser/web", "APIs", "Database", "Email", "Social media", "Users/customers", "Payments", "Production infrastructure", "Physical devices", "Other"]
MEMORY_OPTIONS = ["Working task state", "Episodic history", "Stable facts", "Verified skills/procedures", "Architecture/experiment history"]
ACTION_OPTIONS = ["Read", "Write", "Communicate", "Deploy", "Purchase", "Delete", "Authenticate", "Publish", "Modify self/harness"]
