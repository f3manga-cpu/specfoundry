import streamlit as st

from specfoundry_core import derived_items, json_spec, markdown_spec, readiness, validate_stage
from specfoundry_schema import ACTION_OPTIONS, ENV_OPTIONS, MEMORY_OPTIONS, STAGES

st.set_page_config(page_title="SpecFoundry — Engineering Spec Wizard", page_icon="🧭", layout="wide", initial_sidebar_state="expanded")

if "answers" not in st.session_state:
    st.session_state.answers = {}
if "stage" not in st.session_state:
    st.session_state.stage = 0

def go(i):
    st.session_state.stage = i
    st.rerun()

pct, errors_by_stage, ready = readiness(st.session_state.answers)

with st.sidebar:
    st.markdown("## SpecFoundry")
    st.caption("Guided engineering specification")
    st.progress(pct / 100)
    st.metric("Implementation readiness", f"{pct}%")
    st.success("Implementation-ready") if ready else st.info("Every engineering gate must pass; critical open questions block readiness.")
    st.divider()
    for i, stage in enumerate(STAGES):
        status = "✅" if not errors_by_stage[stage["id"]] else ("▶️" if i == st.session_state.stage else "○")
        if st.button(f"{status} {i+1}. {stage['title']}", key=f"nav_{i}", use_container_width=True):
            go(i)
    st.divider()
    if st.button("Reset specification", use_container_width=True):
        st.session_state.answers = {}
        st.session_state.stage = 0
        st.rerun()

stage = STAGES[st.session_state.stage]
st.markdown("# SpecFoundry")
st.caption("Turn an underspecified AI/agent idea into a decisive, implementation-ready engineering specification.")
main, inspector = st.columns([1.75, 1], gap="large")

with main:
    st.markdown(f"### {st.session_state.stage + 1}. {stage['title']}")
    st.write(stage["intro"])
    st.info(stage["guidance"], icon="🧭")
    for key, kind, label, help_text in stage["fields"]:
        current = st.session_state.answers.get(key)
        if kind == "textarea":
            value = st.text_area(label, value=current or "", help=help_text, height=130, key=f"widget_{key}")
        elif kind == "text":
            value = st.text_input(label, value=current or "", help=help_text, key=f"widget_{key}")
        elif kind == "number":
            default = int(current) if current else (5 if key == "runs_per_task" else 30)
            value = st.number_input(label, min_value=1, max_value=10000, value=default, step=1, help=help_text, key=f"widget_{key}")
        elif kind == "environments":
            value = st.multiselect(label, ENV_OPTIONS, default=current or [], help=help_text, key=f"widget_{key}")
        elif kind == "memory":
            value = st.multiselect(label, MEMORY_OPTIONS, default=current or [], help=help_text, key=f"widget_{key}")
        elif kind == "actions":
            value = st.multiselect(label, ACTION_OPTIONS, default=current or [], help=help_text, key=f"widget_{key}")
        st.session_state.answers[key] = value.strip() if isinstance(value, str) else value

    stage_errors = validate_stage(stage, st.session_state.answers)
    if stage_errors:
        st.warning("This stage is not yet engineering-complete.")
        for err in stage_errors:
            st.markdown(f"- {err}")
    else:
        st.success("This stage passes its current engineering gate.")

    back, nxt = st.columns(2)
    with back:
        if st.button("← Back", disabled=st.session_state.stage == 0, use_container_width=True):
            go(st.session_state.stage - 1)
    with nxt:
        last = st.session_state.stage == len(STAGES) - 1
        if st.button("Finish" if last else "Continue →", type="primary", disabled=bool(stage_errors), use_container_width=True):
            if not last:
                go(st.session_state.stage + 1)

with inspector:
    st.markdown("### Live specification")
    st.caption("Your answers stay distinct from requirements, risks, and assumptions inferred from them.")
    current_tab, derived_tab, readiness_tab = st.tabs(["Current", "Derived", "Readiness"])
    with current_tab:
        for s in STAGES:
            answered = []
            for key, _, label, _ in s["fields"]:
                value = st.session_state.answers.get(key)
                if value not in (None, "", []):
                    answered.append((label, ", ".join(value) if isinstance(value, list) else str(value)))
            if answered:
                with st.expander(s["title"], expanded=s["id"] == stage["id"]):
                    for label, value in answered:
                        st.markdown(f"**{label}**")
                        st.write(value)
    with derived_tab:
        derived = derived_items(st.session_state.answers)
        for title, key in [("Requirements", "requirements"), ("Risks", "risks"), ("Assumptions", "assumptions"), ("Open questions", "open")]:
            st.markdown(f"**{title}**")
            if derived[key]:
                for item in derived[key]:
                    st.markdown(f"- {item}")
            else:
                st.caption("None derived yet.")
    with readiness_tab:
        pct, errors_by_stage, ready = readiness(st.session_state.answers)
        st.metric("Readiness", f"{pct}%")
        for s in STAGES:
            errs = errors_by_stage[s["id"]]
            st.markdown(f"**{'✅' if not errs else '○'} {s['title']}**")
            for err in errs:
                st.caption(err)

st.divider()
st.markdown("### Export")
left, right = st.columns(2)
with left:
    st.download_button("Download SPEC.md", markdown_spec(st.session_state.answers), "SPEC.md", "text/markdown", use_container_width=True)
with right:
    st.download_button("Download spec.json", json_spec(st.session_state.answers), "spec.json", "application/json", use_container_width=True)
if not ready:
    st.caption("Export is available at any time, but the spec is not marked implementation-ready until all gates pass.")
