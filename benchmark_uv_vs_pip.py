#!/usr/bin/env python3
"""
Benchmark: UV vs PIP Performance Comparison
"""
import subprocess
import time
import os
import tempfile
import shutil


def time_command(cmd, description):
    """Time a command execution"""
    print(f"\n{'='*60}")
    print(f"⏱️  {description}")
    print(f"Command: {cmd}")
    print(f"{'='*60}")
    
    start = time.time()
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        elapsed = time.time() - start
        
        if result.returncode == 0:
            print(f"✅ Completed in {elapsed:.2f}s")
        else:
            print(f"❌ Failed in {elapsed:.2f}s")
            if result.stderr:
                print(f"Error: {result.stderr[:200]}")
        
        return elapsed, result.returncode == 0
    except Exception as e:
        print(f"❌ Exception: {e}")
        return 0, False


def main():
    print("🏁 UV vs PIP Performance Benchmark")
    print("=" * 80)
    
    # Check tools
    print("\n📋 Checking tools...")
    uv_check = subprocess.run("uv --version", shell=True, capture_output=True)
    pip_check = subprocess.run("pip --version", shell=True, capture_output=True)
    
    if uv_check.returncode != 0:
        print("❌ UV not installed. Install with:")
        print("   curl -LsSf https://astral.sh/uv/install.sh | sh")
        return
    
    if pip_check.returncode != 0:
        print("❌ PIP not found")
        return
    
    print("✅ Both tools available")
    
    # Create test packages list
    test_packages = [
        "requests",
        "numpy",
        "pandas",
        "fastapi",
        "pydantic",
        "httpx",
        "pytest",
        "black",
        "ruff",
        "sqlalchemy"
    ]
    
    # Results storage
    results = {
        "pip": {"times": [], "success": []},
        "uv": {"times": [], "success": []}
    }
    
    # Test 1: Virtual Environment Creation
    print("\n\n🧪 Test 1: Virtual Environment Creation")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # PIP/venv
        venv_dir = os.path.join(tmpdir, "venv_pip")
        pip_time, pip_success = time_command(
            f"python -m venv {venv_dir}",
            "Creating venv with Python"
        )
        results["pip"]["times"].append(pip_time)
        results["pip"]["success"].append(pip_success)
        
        # UV
        venv_dir = os.path.join(tmpdir, "venv_uv")
        uv_time, uv_success = time_command(
            f"uv venv {venv_dir} --python 3.11",
            "Creating venv with UV"
        )
        results["uv"]["times"].append(uv_time)
        results["uv"]["success"].append(uv_success)
    
    # Test 2: Single Package Installation
    print("\n\n🧪 Test 2: Single Package Installation (requests)")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # PIP
        venv_dir = os.path.join(tmpdir, "venv_pip")
        subprocess.run(f"python -m venv {venv_dir}", shell=True, capture_output=True)
        pip_time, pip_success = time_command(
            f"{venv_dir}/bin/pip install requests",
            "Installing with PIP"
        )
        results["pip"]["times"].append(pip_time)
        results["pip"]["success"].append(pip_success)
        
        # UV
        venv_dir = os.path.join(tmpdir, "venv_uv")
        subprocess.run(f"uv venv {venv_dir}", shell=True, capture_output=True)
        uv_time, uv_success = time_command(
            f"uv pip install --python {venv_dir} requests",
            "Installing with UV"
        )
        results["uv"]["times"].append(uv_time)
        results["uv"]["success"].append(uv_success)
    
    # Test 3: Multiple Package Installation
    print("\n\n🧪 Test 3: Multiple Package Installation")
    
    packages_str = " ".join(test_packages[:5])
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # PIP
        venv_dir = os.path.join(tmpdir, "venv_pip")
        subprocess.run(f"python -m venv {venv_dir}", shell=True, capture_output=True)
        pip_time, pip_success = time_command(
            f"{venv_dir}/bin/pip install {packages_str}",
            "Installing 5 packages with PIP"
        )
        results["pip"]["times"].append(pip_time)
        results["pip"]["success"].append(pip_success)
        
        # UV
        venv_dir = os.path.join(tmpdir, "venv_uv")
        subprocess.run(f"uv venv {venv_dir}", shell=True, capture_output=True)
        uv_time, uv_success = time_command(
            f"uv pip install --python {venv_dir} {packages_str}",
            "Installing 5 packages with UV"
        )
        results["uv"]["times"].append(uv_time)
        results["uv"]["success"].append(uv_success)
    
    # Test 4: Requirements file
    print("\n\n🧪 Test 4: Requirements File Installation")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create requirements file
        req_file = os.path.join(tmpdir, "requirements.txt")
        with open(req_file, "w") as f:
            f.write("\n".join(test_packages))
        
        # PIP
        venv_dir = os.path.join(tmpdir, "venv_pip")
        subprocess.run(f"python -m venv {venv_dir}", shell=True, capture_output=True)
        pip_time, pip_success = time_command(
            f"{venv_dir}/bin/pip install -r {req_file}",
            "Installing from requirements.txt with PIP"
        )
        results["pip"]["times"].append(pip_time)
        results["pip"]["success"].append(pip_success)
        
        # UV
        venv_dir = os.path.join(tmpdir, "venv_uv")
        subprocess.run(f"uv venv {venv_dir}", shell=True, capture_output=True)
        uv_time, uv_success = time_command(
            f"uv pip install --python {venv_dir} -r {req_file}",
            "Installing from requirements.txt with UV"
        )
        results["uv"]["times"].append(uv_time)
        results["uv"]["success"].append(uv_success)
    
    # Summary
    print("\n\n" + "="*80)
    print("📊 BENCHMARK RESULTS")
    print("="*80)
    
    # Calculate totals and speedup
    pip_total = sum(results["pip"]["times"])
    uv_total = sum(results["uv"]["times"])
    speedup = pip_total / uv_total if uv_total > 0 else 0
    
    print(f"\n⏱️  Total Time:")
    print(f"   PIP: {pip_total:.2f}s")
    print(f"   UV:  {uv_total:.2f}s")
    print(f"\n🚀 UV is {speedup:.1f}x faster overall!")
    
    # Individual test results
    print("\n📈 Individual Tests:")
    test_names = [
        "Venv Creation",
        "Single Package",
        "Multiple Packages",
        "Requirements File"
    ]
    
    for i, test_name in enumerate(test_names):
        if i < len(results["pip"]["times"]) and i < len(results["uv"]["times"]):
            pip_time = results["pip"]["times"][i]
            uv_time = results["uv"]["times"][i]
            test_speedup = pip_time / uv_time if uv_time > 0 else 0
            
            print(f"\n{test_name}:")
            print(f"   PIP: {pip_time:.2f}s")
            print(f"   UV:  {uv_time:.2f}s ({test_speedup:.1f}x faster)")
    
    print("\n\n💡 Key Advantages of UV:")
    print("• Written in Rust for maximum performance")
    print("• Parallel downloads and installations")
    print("• Better dependency resolution algorithm")
    print("• Integrated virtual environment management")
    print("• Smart caching system")
    print("• Drop-in replacement for pip")
    
    print("\n🎯 For BioThings:")
    print("• Faster CI/CD pipelines")
    print("• Quicker development iterations")
    print("• Reduced deployment times")
    print("• Better reproducibility with lock files")


if __name__ == "__main__":
    main()