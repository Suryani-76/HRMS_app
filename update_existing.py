import os

desktop = r'C:\Users\Gouda Suryani\Desktop'

def read_file(name):
    with open(os.path.join(desktop, name), 'r', encoding='utf-8') as f:
        return f.read()

def write_file(name, content):
    with open(os.path.join(desktop, name), 'w', encoding='utf-8') as f:
        f.write(content)

# === Helper: replace content section between page-header and </section> ===
def replace_content(html, new_content):
    start = html.find('<section class="dash-container">')
    end = html.find('</section>', start) + len('</section>')
    return html[:start] + new_content + html[end:]

# === 1. Update nominees.html - Full Insurance Form ===
nominees_html = read_file('nominees.html')
new_nominees = '''    <section class="dash-container">
        <div class="dash-content">
            <div class="page-header">
                <div class="page-block">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="page-header-title">
                                <h4 class="m-b-10">Insurance Details</h4>
                            </div>
                            <ul class="breadcrumb"><li class="breadcrumb-item"><a href="dashboard.html">Home</a></li>
    <li class="breadcrumb-item">Insurance Details</li></ul>
                        </div>
                        <div class="col-sm-auto col-md">
                            <div class="float-end"><a href="#" class="btn btn-sm btn-primary"><i class="ti ti-plus"></i> New Insurance</a></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-xl-12">
                    <div class="card">
                        <div class="card-header"><h5>Insurance Data Collection Form</h5></div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h5>Employee Information</h5>
                                    <div class="mb-2"><strong>Employee Name:</strong> employee2</div>
                                    <div class="mb-2"><strong>Employee ID:</strong> EMP0007</div>
                                    <div class="mb-2"><strong>Department:</strong> Accounts</div>
                                    <div class="mb-2"><strong>Date of Joining:</strong> May 27, 2025</div>
                                </div>
                                <div class="col-md-6">
                                    <h5>Insurance Information</h5>
                                    <div class="mb-2"><strong>Policy Number:</strong> POL-2026-001</div>
                                    <div class="mb-2"><strong>Insurance Provider:</strong> ICICI Lombard</div>
                                    <div class="mb-2"><strong>Coverage Amount:</strong> Rs 5,00,000</div>
                                    <div class="mb-2"><strong>Valid From:</strong> Jan 1, 2026</div>
                                    <div class="mb-2"><strong>Valid Until:</strong> Dec 31, 2026</div>
                                </div>
                            </div>
                            <hr>
                            <div class="row">
                                <div class="col-md-6">
                                    <h5>Residential Address</h5>
                                    <div class="mb-2">123, HRMS Layout, Phase 2</div>
                                    <div class="mb-2">Hyderabad, Telangana - 500001</div>
                                </div>
                                <div class="col-md-6">
                                    <h5>Emergency Contact</h5>
                                    <div class="mb-2"><strong>Name:</strong> Mrs. Suryani</div>
                                    <div class="mb-2"><strong>Phone:</strong> +91-9876543210</div>
                                    <div class="mb-2"><strong>Relationship:</strong> Spouse</div>
                                </div>
                            </div>
                            <hr>
                            <h5>Nominee & Family Details</h5>
                            <div class="table-responsive mb-3">
                                <table class="table">
                                    <thead><tr><th>Name</th><th>Relationship</th><th>Date of Birth</th><th>Nominee %</th></tr></thead>
                                    <tbody>
                                        <tr><td>Mrs. Suryani</td><td>Spouse</td><td>Jan 15, 1990</td><td>50%</td></tr>
                                        <tr><td>Master A. Suryani</td><td>Son</td><td>Jan 15, 2018</td><td>30%</td></tr>
                                        <tr><td>Mrs. L. Suryani</td><td>Mother</td><td>Jun 8, 1965</td><td>20%</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <h5>Existing Insurance Details (Optional)</h5>
                            <div class="mb-2">None declared</div>
                            <hr>
                            <h5>Bank Details for Insurance Payout</h5>
                            <div class="mb-2"><strong>Account Holder:</strong> employee2</div>
                            <div class="mb-2"><strong>Account Number:</strong> XXXX5678</div>
                            <div class="mb-2"><strong>IFSC Code:</strong> HDFC005678</div>
                            <div class="mb-2"><strong>Bank:</strong> HDFC Bank</div>
                            <hr>
                            <h5>Employee Declaration</h5>
                            <div class="mb-2">I hereby declare that the information provided above is true and correct to the best of my knowledge.</div>
                            <div class="row mt-3">
                                <div class="col-md-4"><strong>Signature:</strong> _________________</div>
                                <div class="col-md-4"><strong>Name:</strong> employee2</div>
                                <div class="col-md-4"><strong>Date:</strong> Jul 30, 2026</div>
                            </div>
                            <hr>
                            <div class="text-muted"><small>Countersigned by HR: _________________</small></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>'''
write_file('nominees.html', replace_content(nominees_html, new_nominees))
print('Updated nominees.html - Full insurance form')

# === 2. Update attendanceemployee.html - Biometric attendance ===
att_html = read_file('attendanceemployee.html')
new_att = '''    <section class="dash-container">
        <div class="dash-content">
            <div class="page-header">
                <div class="page-block">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="page-header-title">
                                <h4 class="m-b-10">Mark Attendance</h4>
                            </div>
                            <ul class="breadcrumb"><li class="breadcrumb-item"><a href="dashboard.html">Home</a></li>
    <li class="breadcrumb-item">Mark Attendance</li></ul>
                        </div>
                        <div class="col-sm-auto col-md">
                            <div class="float-end"><a href="#" class="btn btn-sm btn-primary"><i class="ti ti-plus"></i> Mark All</a></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <i class="ti ti-face-id" style="font-size: 48px; color: var(--color-customColor);"></i>
                            <h5 class="mt-2">Face Recognition</h5>
                            <p class="text-muted mb-0">Biometric attendance via facial scan</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <i class="ti ti-fingerprint" style="font-size: 48px; color: var(--color-customColor);"></i>
                            <h5 class="mt-2">Fingerprint Scan</h5>
                            <p class="text-muted mb-0">Biometric attendance via fingerprint</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <i class="ti ti-clock" style="font-size: 48px; color: var(--color-customColor);"></i>
                            <h5 class="mt-2">Today: Jul 30, 2026</h5>
                            <p class="text-muted mb-0">Status: <span class="badge bg-success">Checked In</span></p>
                            <p class="mb-0">09:05 AM</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-xl-12">
                    <div class="card">
                        <div class="card-header card-body table-border-style">
                            <div class="table-responsive">
                                <table class="table">
                                    <thead><tr><th>Employee</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Biometric Type</th><th>Late Minutes</th><th>Status</th><th>Action</th></tr></thead>
                                    <tbody>
                                        <tr><td>employee2</td><td>Jul 30, 2026</td><td>09:05 AM</td><td>-</td><td>Face</td><td>5 min</td><td><span class="badge bg-success">Present</span></td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm"><i class="ti ti-eye text-white"></i></a></div></td></tr>
                                        <tr><td>Admin</td><td>Jul 30, 2026</td><td>08:55 AM</td><td>-</td><td>Fingerprint</td><td>0 min</td><td><span class="badge bg-success">Present</span></td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm"><i class="ti ti-eye text-white"></i></a></div></td></tr>
                                        <tr><td>employee3</td><td>Jul 30, 2026</td><td>09:30 AM</td><td>-</td><td>Face</td><td>30 min</td><td><span class="badge bg-warning">Late</span></td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm"><i class="ti ti-eye text-white"></i></a></div></td></tr>
                                        <tr><td>employee4</td><td>Jul 30, 2026</td><td>-</td><td>-</td><td>-</td><td>-</td><td><span class="badge bg-danger">Absent</span></td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm"><i class="ti ti-eye text-white"></i></a></div></td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>'''
write_file('attendanceemployee.html', replace_content(att_html, new_att))
print('Updated attendanceemployee.html - Biometric attendance')

# === 3. Update payslip.html - With deductions ===
payslip_html = read_file('payslip.html')
new_payslip = '''    <section class="dash-container">
        <div class="dash-content">
            <div class="page-header">
                <div class="page-block">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="page-header-title">
                                <h4 class="m-b-10">Payslip</h4>
                            </div>
                            <ul class="breadcrumb"><li class="breadcrumb-item"><a href="dashboard.html">Home</a></li>
    <li class="breadcrumb-item">Payslip</li></ul>
                        </div>
                        <div class="col-sm-auto col-md">
                            <div class="float-end"><a href="#" class="btn btn-sm btn-primary"><i class="ti ti-download"></i> Export All</a></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-xl-12">
                    <div class="card">
                        <div class="card-header"><h5>July 2026 Payslip - employee2</h5></div>
                        <div class="card-body">
                            <div class="row mb-3">
                                <div class="col-md-3"><strong>Employee:</strong> employee2</div>
                                <div class="col-md-3"><strong>Employee ID:</strong> EMP0007</div>
                                <div class="col-md-3"><strong>Department:</strong> Accounts</div>
                                <div class="col-md-3"><strong>Designation:</strong> Sr Accountant</div>
                            </div>
                            <div class="table-responsive mb-3">
                                <table class="table">
                                    <thead><tr><th>Component</th><th>Amount</th></tr></thead>
                                    <tbody>
                                        <tr><td>Basic Salary</td><td>Rs 35,000</td></tr>
                                        <tr><td>HRA</td><td>Rs 15,000</td></tr>
                                        <tr><td>Conveyance</td><td>Rs 3,000</td></tr>
                                        <tr><td>Medical</td><td>Rs 2,000</td></tr>
                                        <tr><td>Special Allowance</td><td>Rs 5,000</td></tr>
                                        <tr class="fw-bold bg-light"><td>Gross Salary</td><td>Rs 60,000</td></tr>
                                        <tr><td colspan="2"></td></tr>
                                        <tr><td>Late Arrival Deductions (3 days)</td><td class="text-danger">-Rs 750</td></tr>
                                        <tr class="fw-bold bg-light"><td>Net Salary</td><td>Rs 59,250</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <p class="text-muted"><small>Late arrival deductions calculated based on attendance log. 3 late arrivals (45 min, 90 min, 30 min) in this cycle.</small></p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-xl-12">
                    <div class="card">
                        <div class="card-header"><h5>Payslip History</h5></div>
                        <div class="card-header card-body table-border-style">
                            <div class="table-responsive">
                                <table class="table">
                                    <thead><tr><th>Month</th><th>Gross Salary</th><th>Late Deduction</th><th>Incentive</th><th>Net Salary</th><th>Status</th><th>Action</th></tr></thead>
                                    <tbody>
                                        <tr><td>July 2026</td><td>Rs 60,000</td><td>Rs 750</td><td>Rs 0</td><td>Rs 59,250</td><td><span class="badge bg-warning">Processing</span></td><td><a href="#" class="btn btn-sm btn-primary"><i class="ti ti-download"></i></a></td></tr>
                                        <tr><td>June 2026</td><td>Rs 60,000</td><td>Rs 500</td><td>Rs 0</td><td>Rs 59,500</td><td><span class="badge bg-success">Paid</span></td><td><a href="#" class="btn btn-sm btn-primary"><i class="ti ti-download"></i></a></td></tr>
                                        <tr><td>May 2026</td><td>Rs 60,000</td><td>Rs 0</td><td>Rs 0</td><td>Rs 60,000</td><td><span class="badge bg-success">Paid</span></td><td><a href="#" class="btn btn-sm btn-primary"><i class="ti ti-download"></i></a></td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>'''
write_file('payslip.html', replace_content(payslip_html, new_payslip))
print('Updated payslip.html - With deduction details')

# === 4. Update career.html - Recruitment pipeline ===
career_html = read_file('career.html')
new_career = '''    <section class="dash-container">
        <div class="dash-content">
            <div class="page-header">
                <div class="page-block">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="page-header-title">
                                <h4 class="m-b-10">Career - Job Openings</h4>
                            </div>
                            <ul class="breadcrumb"><li class="breadcrumb-item"><a href="dashboard.html">Home</a></li>
    <li class="breadcrumb-item">Career</li></ul>
                        </div>
                        <div class="col-sm-auto col-md"></div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-xl-12">
                    <div class="card">
                        <div class="card-body">
                            <h5>Recruitment Pipeline</h5>
                            <div class="d-flex justify-content-between mb-4">
                                <span class="badge bg-primary p-2">Applied</span>
                                <span class="text-muted"><i class="ti ti-arrow-right"></i></span>
                                <span class="badge bg-info p-2">Shortlisted</span>
                                <span class="text-muted"><i class="ti ti-arrow-right"></i></span>
                                <span class="badge bg-warning p-2">Interview</span>
                                <span class="text-muted"><i class="ti ti-arrow-right"></i></span>
                                <span class="badge bg-success p-2">Selected</span>
                                <span class="text-muted"><i class="ti ti-arrow-right"></i></span>
                                <span class="badge bg-info p-2">Offer Sent</span>
                                <span class="text-muted"><i class="ti ti-arrow-right"></i></span>
                                <span class="badge bg-success p-2">Onboarded</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-xl-12">
                    <div class="card">
                        <div class="card-header"><h5>Open Positions</h5></div>
                        <div class="card-header card-body table-border-style">
                            <div class="table-responsive">
                                <table class="table">
                                    <thead><tr><th>Job Title</th><th>Department</th><th>Location</th><th>Experience</th><th>Posted Date</th><th>Status</th><th>Action</th></tr></thead>
                                    <tbody>
                                        <tr><td>Software Engineer</td><td>IT</td><td>Hyderabad</td><td>2-4 years</td><td>Jul 1, 2026</td><td><span class="badge bg-success">Open</span></td><td><a href="#" class="btn btn-sm btn-primary">Apply</a></td></tr>
                                        <tr><td>HR Executive</td><td>HR</td><td>Bangalore</td><td>1-3 years</td><td>Jun 25, 2026</td><td><span class="badge bg-success">Open</span></td><td><a href="#" class="btn btn-sm btn-primary">Apply</a></td></tr>
                                        <tr><td>UI/UX Designer</td><td>Design</td><td>Remote</td><td>3-5 years</td><td>Jul 5, 2026</td><td><span class="badge bg-success">Open</span></td><td><a href="#" class="btn btn-sm btn-primary">Apply</a></td></tr>
                                        <tr><td>Marketing Lead</td><td>Marketing</td><td>Mumbai</td><td>5-7 years</td><td>Jun 20, 2026</td><td><span class="badge bg-warning">Draft</span></td><td><a href="#" class="btn btn-sm btn-secondary">Coming Soon</a></td></tr>
                                        <tr><td>Accountant</td><td>Finance</td><td>Hyderabad</td><td>2-4 years</td><td>Jun 15, 2026</td><td><span class="badge bg-secondary">Closed</span></td><td><a href="#" class="btn btn-sm btn-secondary">Closed</a></td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>'''
write_file('career.html', replace_content(career_html, new_career))
print('Updated career.html - Recruitment pipeline')

# === 5. Update employee.html - OKLUT ID format ===
emp_html = read_file('employee.html')
new_emp = '''    <section class="dash-container">
        <div class="dash-content">
            <div class="page-header">
                <div class="page-block">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="page-header-title">
                                <h4 class="m-b-10">Manage Employee</h4>
                            </div>
                            <ul class="breadcrumb"><li class="breadcrumb-item"><a href="dashboard.html">Home</a></li>
    <li class="breadcrumb-item">Manage Employee</li></ul>
                        </div>
                        <div class="col-sm-auto col-md">
                            <div class="float-end"><a href="#" class="btn btn-sm btn-primary"><i class="ti ti-file-export"></i></a> <a href="#" class="btn btn-sm btn-primary"><i class="ti ti-file"></i></a> <a href="#" class="btn btn-sm btn-primary"><i class="ti ti-plus"></i> Add</a></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12 mb-3">
                    <div class="card bg-light p-3">
                        <h5>OKLUT Employee ID Format</h5>
                        <p class="mb-1"><code><strong>OKLUT-{Country}-{State}-{City}-{Branch}-{Department}-{Sequence}</strong></code></p>
                        <p class="mb-0 text-muted">Example: <code>OKLUT-IN-TG-HYD-HYD-ACC-001</code> (India, Telangana, Hyderabad, Hyderabad branch, Accounts, 1st employee)</p>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-xl-12">
                    <div class="card">
                        <div class="card-header card-body table-border-style">
                            <div class="table-responsive">
                                <table class="table">
                                    <thead><tr><th>Employee ID</th><th>OKLUT ID</th><th>Name</th><th>Email</th><th>Branch</th><th>Department</th><th>Designation</th><th>Date Of Joining</th><th>Action</th></tr></thead>
                                    <tbody>
                                        <tr><td>EMP0001</td><td>OKLUT-IN-TG-HYD-HYD-ADM-001</td><td>Admin</td><td>admin@example.com</td><td>Hyderabad</td><td>Administration</td><td>Admin</td><td>Jan 1, 2025</td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm align-items-center"><i class="ti ti-pencil text-white"></i></a></div></td></tr>
                                        <tr><td>EMP0007</td><td>OKLUT-IN-TG-HYD-HYD-ACC-001</td><td>employee2</td><td>employee2@example.com</td><td>Hyderabad</td><td>Accounts</td><td>Sr Accountant</td><td>May 27, 2025</td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm align-items-center"><i class="ti ti-pencil text-white"></i></a></div></td></tr>
                                        <tr><td>EMP0003</td><td>OKLUT-IN-TG-HYD-HYD-IT-001</td><td>employee3</td><td>employee3@example.com</td><td>Hyderabad</td><td>IT</td><td>Software Engineer</td><td>Mar 15, 2025</td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm align-items-center"><i class="ti ti-pencil text-white"></i></a></div></td></tr>
                                        <tr><td>EMP0004</td><td>OKLUT-IN-TG-HYD-HYD-HR-001</td><td>employee4</td><td>employee4@example.com</td><td>Hyderabad</td><td>HR</td><td>HR Executive</td><td>Feb 1, 2025</td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm align-items-center"><i class="ti ti-pencil text-white"></i></a></div></td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>'''
write_file('employee.html', replace_content(emp_html, new_emp))
print('Updated employee.html - OKLUT ID format')

print('\nAll existing pages updated!')
