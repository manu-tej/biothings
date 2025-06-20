#!/usr/bin/env python3
"""
Demo: UV Package Manager Features with BioThings
Shows the speed and capabilities of uv
"""
import subprocess
import time
import os
import sys


def run_command(cmd, description=""):
    """Run a command and time it"""
    if description:
        print(f"\n{'='*60}")
        print(f"📋 {description}")
        print(f"{'='*60}")
    
    print(f"$ {cmd}")
    start_time = time.time()
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        elapsed = time.time() - start_time
        
        if result.returncode == 0:
            print(f"✅ Success in {elapsed:.2f}s")
            if result.stdout:
                print(result.stdout[:500] + "..." if len(result.stdout) > 500 else result.stdout)
        else:
            print(f"❌ Failed in {elapsed:.2f}s")
            if result.stderr:
                print(f"Error: {result.stderr[:500]}")
        
        return result.returncode == 0, elapsed
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False, 0


def main():
    print("🚀 UV Package Manager Demo for BioThings")
    print("=" * 80)
    
    # Check if uv is installed
    print("\n1️⃣ Checking UV installation...")
    success, _ = run_command("uv --version")
    if not success:
        print("\n❌ UV not installed. Install it with:")
        print("   curl -LsSf https://astral.sh/uv/install.sh | sh")
        return
    
    # Navigate to backend
    os.chdir("backend")
    
    # Demo 1: Create virtual environment
    run_command(
        "uv venv --python 3.11",
        "Creating virtual environment (compare to python -m venv)"
    )
    
    # Demo 2: Install single package
    run_command(
        "uv pip install httpx",
        "Installing single package (compare to pip install)"
    )
    
    # Demo 3: Show installed packages
    run_command(
        "uv pip list | head -10",
        "List installed packages"
    )
    
    # Demo 4: Compile requirements
    if os.path.exists("requirements.txt"):
        run_command(
            "uv pip compile requirements.txt -o requirements-locked.txt | head -20",
            "Compile requirements with locked versions"
        )
    
    # Demo 5: Add package to project
    if os.path.exists("pyproject.toml"):
        run_command(
            "uv add requests",
            "Add package to project (updates pyproject.toml)"
        )
    
    # Demo 6: Create lock file
    run_command(
        "uv lock --preview",
        "Create lock file for reproducible builds"
    )
    
    # Demo 7: Sync environment
    run_command(
        "uv sync --preview",
        "Sync environment with lock file"
    )
    
    # Demo 8: Run command in environment
    run_command(
        'uv run python -c "import sys; print(f\'Python {sys.version}\')"',
        "Run Python command in UV environment"
    )
    
    # Demo 9: Install with extras
    run_command(
        "uv pip install 'langchain[all]'",
        "Install package with extras (all optional dependencies)"
    )
    
    # Demo 10: Tool usage
    run_command(
        "uv tool run ruff --version",
        "Run tool without installing (like npx)"
    )
    
    # Back to root
    os.chdir("..")
    
    print("\n" + "="*80)
    print("📊 UV Demo Summary")
    print("="*80)
    print("\n✨ Key UV Features Demonstrated:")
    print("• ⚡ Lightning-fast package installation")
    print("• 🔒 Lock files for reproducible builds")
    print("• 🐍 Built-in Python version management")
    print("• 📦 Project dependency management")
    print("• 🛠️ Tool running without installation")
    print("• 🔄 Environment syncing")
    print("\n💡 UV vs Traditional Tools:")
    print("• uv venv     → python -m venv (10x faster)")
    print("• uv pip      → pip (10-100x faster)")
    print("• uv lock     → pip-tools compile")
    print("• uv sync     → pip-sync")
    print("• uv tool run → pipx run")
    print("\n🎯 For BioThings:")
    print("• Faster development cycles")
    print("• Reproducible deployments")
    print("• Simplified dependency management")
    print("• Better caching for CI/CD")


if __name__ == "__main__":
    main()