import time
import requests
import json
import sys

# Ensure UTF-8 output if possible
if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000/api"
HEADERS = {"Authorization": "Bearer demo-token", "Content-Type": "application/json"}

def test_full_pipeline():
    print("=" * 60)
    print("RESEARCHMIND AI - END-TO-END MSE VERIFICATION TEST")
    print("=" * 60)

    # 1. Health check
    print("\n[Step 1] Checking Health...")
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("[PASS] Health Check Passed:", r.json())

    # 2. Create Project
    print("\n[Step 2] Creating Research Project...")
    proj_payload = {
        "name": "Transformer & Vision Architectures Review",
        "description": "Cross-paper comparative analysis evaluating Attention mechanisms, Vision Transformers, and ResNet architectures."
    }
    r = requests.post(f"{BASE_URL}/projects", headers=HEADERS, json=proj_payload)
    assert r.status_code == 201, f"Project creation failed: {r.text}"
    project = r.json()
    project_id = project["id"]
    print(f"[PASS] Project Created: ID={project_id}, Name='{project['name']}'")

    # 3. Seed Sample PDFs
    print("\n[Step 3] Seeding 3 Real Research PDFs (PyMuPDF Generation & Extraction)...")
    r = requests.post(f"{BASE_URL}/papers/{project_id}/seed-samples", headers=HEADERS)
    assert r.status_code == 200, f"Seed failed: {r.text}"
    print("[PASS] Seeded sample papers:", r.json())

    # 4. Wait for PyMuPDF extraction and embedding
    print("\n[Step 4] Polling Paper Status (PyMuPDF Extraction & all-MiniLM-L6-v2 Embeddings)...")
    max_wait = 90
    start = time.time()
    papers = []
    while time.time() - start < max_wait:
        r = requests.get(f"{BASE_URL}/papers/{project_id}", headers=HEADERS)
        papers = r.json().get("papers", [])
        statuses = [p["status"] for p in papers]
        print(f"  Current statuses ({int(time.time() - start)}s): {statuses}")
        if len(papers) >= 3 and all(s in ["ready", "extracted"] for s in statuses):
            print("[PASS] All 3 papers processed successfully!")
            break
        time.sleep(3)

    # 5. Inspect Paper Details
    print("\n[Step 5] Inspecting PyMuPDF Extracted Metadata for Paper 1...")
    paper_1_id = papers[0]["id"]
    r = requests.get(f"{BASE_URL}/papers/{project_id}/{paper_1_id}", headers=HEADERS)
    assert r.status_code == 200
    p1_detail = r.json()
    print(f"  Title: {p1_detail['title']}")
    print(f"  Authors: {p1_detail['authors']}")
    print(f"  Page Count: {p1_detail['page_count']}")
    print(f"  Chunk Count: {p1_detail['chunk_count']}")
    print(f"  Abstract Snippet: {p1_detail['abstract'][:150]}...")
    print(f"  Full Text Length: {len(p1_detail.get('full_text') or '')} chars")
    assert p1_detail['page_count'] is not None and p1_detail['page_count'] > 0
    assert p1_detail['chunk_count'] > 0
    print("[PASS] PyMuPDF Extraction validated with real document data!")

    # 6. Start Multi-Paper Intelligence Analysis
    print("\n[Step 6] Starting Multi-Paper Intelligence Analysis...")
    r = requests.post(f"{BASE_URL}/analysis/{project_id}/run", headers=HEADERS, json={"analysis_type": "full"})
    assert r.status_code == 202, f"Start analysis failed: {r.text}"
    analysis = r.json()
    print("[PASS] Analysis queued with ID:", analysis["id"])

    # 7. Poll Analysis Status
    print("\n[Step 7] Polling Analysis Stages (Similarity -> Domains -> Gaps)...")
    start = time.time()
    while time.time() - start < 120:
        r = requests.get(f"{BASE_URL}/analysis/{project_id}/status", headers=HEADERS)
        st = r.json()
        print(f"  Analysis status: {st['status']} - {st.get('status_message')}")
        if st["status"] == "completed":
            print("[PASS] Analysis completed successfully!")
            break
        elif st["status"] == "failed":
            raise RuntimeError(f"Analysis failed: {st.get('status_message')}")
        time.sleep(3)

    # 8. Fetch Dashboard
    print("\n[Step 8] Retrieving Visual Results Dashboard Data...")
    r = requests.get(f"{BASE_URL}/analysis/{project_id}/dashboard", headers=HEADERS)
    assert r.status_code == 200
    dashboard = r.json()

    print("\n" + "=" * 60)
    print("DASHBOARD RESULTS SUMMARY:")
    print("=" * 60)
    print(f"Papers Analyzed: {dashboard['paper_count']}")
    print(f"Primary Research Domain: {dashboard['domains'][0]['name'] if dashboard['domains'] else 'N/A'}")
    if dashboard['domains'] and dashboard['domains'][0].get('keywords'):
        print(f"Extracted Keywords: {', '.join(dashboard['domains'][0]['keywords'])}")

    print("\n--- PAIRWISE PAPER SIMILARITY MATRIX ---")
    matrix = dashboard.get("similarity_matrix") or []
    for row_idx, row in enumerate(matrix):
        row_str = " | ".join([f"{val*100:5.1f}%" for val in row])
        print(f"Paper {row_idx + 1}: [ {row_str} ]")

    print("\n--- AI-GENERATED PRELIMINARY RESEARCH GAPS ---")
    gaps = dashboard.get("gaps") or []
    for idx, g in enumerate(gaps):
        print(f"\nGap {idx + 1}: [{g.get('gap_type')}] {g.get('title')}")
        print(f"  Confidence: {int((g.get('confidence') or 0.7)*100)}%")
        print(f"  Description: {g.get('description')}")
        print(f"  Future Direction: {g.get('future_direction')}")

    print("\n" + "=" * 60)
    print("[PASS] END-TO-END PIPELINE VERIFIED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_full_pipeline()
