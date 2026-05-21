import sys
import os
import platform
import subprocess

def print_file(file_path):
    """
    Sends a file to the default physical printer.
    
    Args:
        file_path (str): The absolute path to the file (.png, .pdf, etc.)
    """
    system_name = platform.system()
    abs_path = os.path.abspath(file_path)
    
    if not os.path.exists(abs_path):
        print(f"Error: File not found at {abs_path}")
        return

    print(f"Attempting to print {abs_path} on {system_name}...")

    try:
        if system_name == "Windows":
            # Windows Implementation
            try:
                import win32api
                import win32print
            except ImportError:
                print("Error: 'pywin32' module is required on Windows.")
                print("Please install it using: pip install pywin32")
                return

            # Get default printer for information purposes
            try:
                printer_name = win32print.GetDefaultPrinter()
                print(f"Targeting default printer: {printer_name}")
            except Exception:
                print("Could not detect default printer name, proceeding anyway...")

            # Use ShellExecute to invoke the associated application's print command
            # 0: Parent window handle (0 = none)
            # "print": Operation to perform
            # abs_path: File to print
            # None: Parameters (not needed for "print" verb usually)
            # ".": Default directory
            # 0: Show command (0 = hide window)
            win32api.ShellExecute(0, "print", abs_path, None, ".", 0)
            print("Print command sent successfully.")
            
        elif system_name == "Linux" or system_name == "Darwin":
            # macOS (Darwin) and Linux Implementation
            # Uses the 'lpr' command (Line Printer Remote) which is standard on CUPS systems
            
            # Check if lpr is available
            try:
                subprocess.run(["which", "lpr"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            except subprocess.CalledProcessError:
                print("Error: 'lpr' command not found. Please ensure CUPS is installed.")
                return

            # Execute lpr
            # macOS/Linux lpr usually handles PDF and images natively via CUPS filters
            subprocess.run(["lpr", abs_path], check=True)
            print("Print job sent to default printer queue.")
            
        else:
            print(f"Error: Unsupported operating system '{system_name}'")

    except Exception as e:
        print(f"An error occurred while printing: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python print_utility.py <path_to_file>")
        print("Example: python print_utility.py document.pdf")
    else:
        print_file(sys.argv[1])
