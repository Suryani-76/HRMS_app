import os, re

desktop = r'C:\Users\Gouda Suryani\Desktop'

# Read employee.html as template
with open(os.path.join(desktop, 'employee.html'), 'r', encoding='utf-8') as f:
    template = f.read()

# Extract parts: everything before the page-header content section,
# and everything after the closing </section>
before_content = template[:template.find('''            <div class="page-header">
                <div class="page-block">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="page-header-title">
                                <h4 class="m-b-10">Manage Employee</h4>''')]

after_content = template[template.find('''        </div>
    </section>

    <footer class="dash-footer">'''):]

def make_page(title, breadcrumb, page_title, table_headers, table_rows, extra_html=''):
    """Generate a page by replacing content section"""
    content_section = f'''    <section class="dash-container">
        <div class="dash-content">
            
            <div class="page-header">
                <div class="page-block">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="page-header-title">
                                <h4 class="m-b-10">{page_title}</h4>
                            </div>
                            <ul class="breadcrumb"><li class="breadcrumb-item"><a href="dashboard.html">Home</a></li>
    <li class="breadcrumb-item">{breadcrumb}</li></ul>
                        </div>
                        <div class="col-sm-auto col-md">
                            <div class="float-end"><a href="#" class="btn btn-sm btn-primary"><i class="ti ti-file-export"></i></a> <a href="#" class="btn btn-sm btn-primary"><i class="ti ti-plus"></i> Add</a></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-xl-12">
                    <div class="card">
                        <div class="card-header card-body table-border-style">
                            {extra_html}
                            <div class="table-responsive">
                                <table class="table">
                                    <thead><tr>{"".join(f'<th>{h}</th>' for h in table_headers)}</tr></thead>
                                    <tbody class="list">{"".join(table_rows)}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>'''
    
    html = before_content + content_section + after_content
    html = html.replace('Manage Employee</h4>', page_title + '</h4>')
    html = html.replace('<title>sample - Manage Employee</title>', f'<title>sample - {page_title}</title>')
    return html

# === 1. Job Postings ===
html = make_page(
    'Job Postings',
    'Recruitment / Job Postings',
    'Job Postings',
    ['Job ID', 'Role Title', 'Department', 'Location', 'Posted Date', 'Status', 'Applications', 'Action'],
    [f'<tr><td>JP-{i:03d}</td><td>{title}</td><td>{dept}</td><td>{loc}</td><td>{date}</td><td><span class="badge bg-{color}">{status}</span></td><td>{apps}</td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm align-items-center"><i class="ti ti-pencil text-white"></i></a></div></td></tr>'
     for i, (title, dept, loc, date, status, color, apps) in enumerate([
         ('Software Engineer', 'IT', 'Hyderabad', 'Jul 1, 2026', 'Active', 'success', 12),
         ('HR Executive', 'HR', 'Bangalore', 'Jun 25, 2026', 'Active', 'success', 8),
         ('Accountant', 'Finance', 'Hyderabad', 'Jun 15, 2026', 'Closed', 'secondary', 15),
         ('UI/UX Designer', 'Design', 'Remote', 'Jul 5, 2026', 'Active', 'success', 6),
         ('Marketing Lead', 'Marketing', 'Mumbai', 'Jun 20, 2026', 'Draft', 'warning', 0),
    ])]
)
with open(os.path.join(desktop, 'job-postings.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('Created job-postings.html')

# === 2. Candidates ===
html = make_page(
    'Candidates',
    'Recruitment / Candidates',
    'Candidates',
    ['Reference ID', 'Name', 'Email', 'Applied For', 'Applied Date', 'Status', 'Action'],
    [f'<tr><td>CAN-{i:03d}</td><td>{name}</td><td>{email}</td><td>{role}</td><td>{date}</td><td><span class="badge bg-{color}">{status}</span></td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm align-items-center"><i class="ti ti-eye text-white"></i></a></div></td></tr>'
     for i, (name, email, role, date, status, color) in enumerate([
         ('Ravi Kumar', 'ravi.k@email.com', 'Software Engineer', 'Jul 2, 2026', 'Applied', 'primary'),
         ('Priya Sharma', 'priya.s@email.com', 'HR Executive', 'Jun 28, 2026', 'Shortlisted', 'info'),
         ('Amit Patel', 'amit.p@email.com', 'Accountant', 'Jun 18, 2026', 'Interview', 'warning'),
         ('Sneha Reddy', 'sneha.r@email.com', 'UI/UX Designer', 'Jul 6, 2026', 'Applied', 'primary'),
         ('Vikram Singh', 'vikram.s@email.com', 'Marketing Lead', 'Jun 22, 2026', 'Selected', 'success'),
         ('Neha Gupta', 'neha.g@email.com', 'Software Engineer', 'Jun 30, 2026', 'Rejected', 'danger'),
         ('Arun Nair', 'arun.n@email.com', 'HR Executive', 'Jun 26, 2026', 'Interview', 'warning'),
    ])]
)
with open(os.path.join(desktop, 'candidates.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('Created candidates.html')

# === 3. Interview Rounds ===
html = make_page(
    'Interview Rounds',
    'Recruitment / Interview Rounds',
    'Interview Rounds',
    ['Candidate', 'Round Type', 'Interviewer', 'Scheduled Date', 'Status', 'Malpractice', 'Result', 'Action'],
    [f'<tr><td>{cand}</td><td>{round_type}</td><td>{intv}</td><td>{date}</td><td><span class="badge bg-{scolor}">{sstatus}</span></td><td>{mal}</td><td>{result}</td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm align-items-center"><i class="ti ti-pencil text-white"></i></a></div></td></tr>'
     for cand, round_type, intv, date, sstatus, scolor, mal, result in [
         ('Ravi Kumar', 'Exam', 'System', 'Jul 5, 2026', 'Completed', 'success', 'No', 'Pass'),
         ('Ravi Kumar', 'Technical', 'Rajesh M.', 'Jul 8, 2026', 'Scheduled', 'warning', '-', '-'),
         ('Priya Sharma', 'Technical', 'Anita K.', 'Jun 30, 2026', 'Completed', 'success', 'No', 'Pass'),
         ('Priya Sharma', 'HR', 'Sunita R.', 'Jul 3, 2026', 'Scheduled', 'warning', '-', '-'),
         ('Amit Patel', 'Technical', 'Rajesh M.', 'Jun 22, 2026', 'Completed', 'success', 'No', 'Pass'),
         ('Amit Patel', 'Manager', 'Vikram S.', 'Jun 25, 2026', 'Completed', 'success', 'No', 'Select'),
         ('Arun Nair', 'Technical', 'Anita K.', 'Jun 29, 2026', 'Pending', 'primary', '-', '-'),
         ('Sneha Reddy', 'Exam', 'System', 'Jul 7, 2026', 'Pending', 'primary', '-', '-'),
    ]]
)
with open(os.path.join(desktop, 'interview-rounds.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('Created interview-rounds.html')

# === 4. Offers ===
html = make_page(
    'Offers',
    'Recruitment / Offers',
    'Offer Management',
    ['Candidate', 'Role', 'CTC Offered (LPA)', 'Relocation', 'Bond', 'Joining Date', 'Status', 'Action'],
    [f'<tr><td>{cand}</td><td>{role}</td><td>{ctc}</td><td>{reloc}</td><td>{bond}</td><td>{date}</td><td><span class="badge bg-{scolor}">{sstatus}</span></td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm align-items-center"><i class="ti ti-pencil text-white"></i></a></div></td></tr>'
     for cand, role, ctc, reloc, bond, date, sstatus, scolor in [
         ('Vikram Singh', 'Marketing Lead', '12.5', 'Yes', '2 years', 'Jul 15, 2026', 'Accepted', 'success'),
         ('Amit Patel', 'Accountant', '6.8', 'No', '1 year', 'Jul 10, 2026', 'Negotiating', 'warning'),
         ('Priya Sharma', 'HR Executive', '5.5', 'Yes', '2 years', '-', 'Offer Sent', 'info'),
         ('Sneha Reddy', 'UI/UX Designer', '8.0', 'No', '1 year', '-', 'Pending', 'primary'),
         ('Rajesh Iyer', 'Software Engineer', '9.0', 'Yes', '-', '-', 'Rejected', 'danger'),
    ]]
)
with open(os.path.join(desktop, 'offers.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('Created offers.html')

# === 5. Onboarding ===
html = make_page(
    'Onboarding',
    'Recruitment / Onboarding',
    'Onboarding',
    ['Employee ID', 'Name', 'OKLUT ID', 'Department', 'Joining Date', 'ID Card Issued', 'Laptop Issued', 'Status', 'Action'],
    [f'<tr><td>{eid}</td><td>{name}</td><td>{oklut}</td><td>{dept}</td><td>{date}</td><td>{idcard}</td><td>{laptop}</td><td><span class="badge bg-{scolor}">{sstatus}</span></td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm align-items-center"><i class="ti ti-pencil text-white"></i></a></div></td></tr>'
     for eid, name, oklut, dept, date, idcard, laptop, sstatus, scolor in [
         ('EMP0008', 'Vikram Singh', 'OKLUT-IN-TG-HYD-HYD-MKT-001', 'Marketing', 'Jul 15, 2026', 'Issued', 'Issued', 'Completed', 'success'),
         ('EMP0009', 'Amit Patel', 'OKLUT-IN-TG-HYD-HYD-ACC-001', 'Finance', 'Jul 10, 2026', 'Pending', 'Pending', 'In Progress', 'warning'),
    ]]
)
with open(os.path.join(desktop, 'onboarding.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('Created onboarding.html')

# === 6. Attendance Log ===
html = make_page(
    'Attendance Log',
    'Attendance / Attendance Log',
    'Attendance Log',
    ['Employee', 'Date', 'Clock In', 'Clock Out', 'Biometric Type', 'Late Minutes', 'Status', 'Action'],
    [f'<tr><td>{emp}</td><td>{date}</td><td>{cin}</td><td>{cout}</td><td>{btype}</td><td>{late}</td><td><span class="badge bg-{scolor}">{sstatus}</span></td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm align-items-center"><i class="ti ti-pencil text-white"></i></a></div></td></tr>'
     for emp, date, cin, cout, btype, late, sstatus, scolor in [
         ('employee2', 'Jul 29, 2026', '09:05 AM', '06:30 PM', 'Face', '5 min', 'Present', 'success'),
         ('employee2', 'Jul 28, 2026', '09:15 AM', '06:00 PM', 'Fingerprint', '15 min', 'Present', 'success'),
         ('employee2', 'Jul 27, 2026', '09:45 AM', '05:45 PM', 'Face', '45 min', 'Late', 'warning'),
         ('employee2', 'Jul 26, 2026', '10:30 AM', '06:15 PM', 'Fingerprint', '90 min', 'Late', 'warning'),
         ('employee2', 'Jul 25, 2026', '09:00 AM', '06:30 PM', 'Face', '0 min', 'Present', 'success'),
         ('employee2', 'Jul 24, 2026', '08:55 AM', '06:00 PM', 'Fingerprint', '0 min', 'Present', 'success'),
         ('employee2', 'Jul 23, 2026', '09:30 AM', '05:30 PM', 'Face', '30 min', 'Late', 'danger'),
    ]]
)
with open(os.path.join(desktop, 'attendance-log.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('Created attendance-log.html')

# === 7. Deduction Rules ===
ded_rules = '''
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <div class="card bg-light p-3 mb-0">
                                        <h5>Late Arrival Deduction Rules</h5>
                                        <table class="table table-bordered mb-0">
                                            <thead><tr><th>Lateness</th><th>Deduction</th></tr></thead>
                                            <tbody>
                                                <tr><td>30 minutes late (no permission)</td><td>1/4 day salary deducted</td></tr>
                                                <tr><td>1 hour late (no permission)</td><td>Additional fixed amount deducted</td></tr>
                                                <tr><td>Late with prior permission</td><td>No deduction</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card bg-light p-3 mb-0">
                                        <h5>Summary</h5>
                                        <p class="mb-1"><strong>Scheduled Job:</strong> Daily lateness calculation at end of day</p>
                                        <p class="mb-1"><strong>Feed into:</strong> Payroll deductions for the month</p>
                                        <p class="mb-0"><strong>Biometric Types:</strong> Face Recognition & Fingerprint</p>
                                    </div>
                                </div>
                            </div>'''
html = make_page(
    'Deduction Rules',
    'Attendance / Deduction Rules',
    'Deduction Rules',
    ['Employee', 'Date', 'Late Minutes', 'Permission', 'Deduction Applied', 'Amount', 'Status'],
    [f'<tr><td>{emp}</td><td>{date}</td><td>{late} min</td><td>{perm}</td><td>{ded}</td><td>{amt}</td><td><span class="badge bg-{scolor}">{sstatus}</span></td></tr>'
     for emp, date, late, perm, ded, amt, sstatus, scolor in [
         ('employee2', 'Jul 27, 2026', 45, 'No', '1/4 day salary', 'Rs 250', 'Applied', 'danger'),
         ('employee2', 'Jul 26, 2026', 90, 'No', '1/4 day + fixed', 'Rs 500', 'Applied', 'danger'),
         ('employee3', 'Jul 26, 2026', 10, 'Yes', 'None', 'Rs 0', 'Waived', 'success'),
         ('employee4', 'Jul 25, 2026', 60, 'No', '1/4 day salary', 'Rs 300', 'Applied', 'danger'),
    ]],
    ded_rules
)
with open(os.path.join(desktop, 'deduction-rules.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('Created deduction-rules.html')

# === 8. Monthly Payout ===
html = make_page(
    'Monthly Payout',
    'Payroll / Monthly Payout',
    'Monthly Payout',
    ['Employee ID', 'Name', 'Bank Account', 'IFSC', 'Net Salary', 'Deductions', 'Incentives', 'Total Payout', 'Status'],
    [f'<tr><td>{eid}</td><td>{name}</td><td>{acct}</td><td>{ifsc}</td><td>{net}</td><td>{ded}</td><td>{inc}</td><td>{total}</td><td><span class="badge bg-{scolor}">{sstatus}</span></td></tr>'
     for eid, name, acct, ifsc, net, ded, inc, total, sstatus, scolor in [
         ('EMP0001', 'Admin', 'XXXX1234', 'SBIN001234', '75,000', '1,250', '0', '73,750', 'Processed', 'success'),
         ('EMP0007', 'employee2', 'XXXX5678', 'HDFC005678', '45,000', '750', '0', '44,250', 'Processed', 'success'),
         ('EMP0003', 'employee3', 'XXXX9012', 'ICIC009012', '50,000', '500', '2,500', '52,000', 'Pending', 'warning'),
         ('EMP0004', 'employee4', 'XXXX3456', 'AXIS003456', '42,000', '300', '1,000', '42,700', 'Pending', 'warning'),
         ('EMP0008', 'Vikram Singh', 'XXXX7890', 'SBIN007890', '95,000', '0', '0', '95,000', 'Draft', 'primary'),
    ]]
)
with open(os.path.join(desktop, 'monthly-payout.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('Created monthly-payout.html')

# === 9. Performance ===
perf_extra = '''
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <div class="card bg-light p-3 mb-0">
                                        <h5>Level 1 Target</h5>
                                        <p class="mb-0 display-6 fw-bold text-primary">2.5</p>
                                        <small class="text-muted">Rating target</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="card bg-light p-3 mb-0">
                                        <h5>Level 2 Target</h5>
                                        <p class="mb-0 display-6 fw-bold text-info">3.0</p>
                                        <small class="text-muted">Rating target</small>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="card bg-light p-3 mb-0">
                                        <h5>Level 3 Target</h5>
                                        <p class="mb-0 display-6 fw-bold text-warning">2.0</p>
                                        <small class="text-muted">Rating target (cycle restarts)</small>
                                    </div>
                                </div>
                            </div>
                            <div class="alert alert-info">
                                <strong>Auto-Flag Rule:</strong> If rating declines for 3 consecutive months, the employee is automatically flagged for review and potential removal.
                            </div>'''
html = make_page(
    'Performance',
    'Performance / Monthly Ratings',
    'Monthly Performance Ratings',
    ['Employee', 'Month', 'Level', 'Rating', 'Target', 'Decline Streak', 'Flagged', 'Action'],
    [f'<tr><td>{emp}</td><td>{month}</td><td>{level}</td><td><strong>{rating}</strong></td><td>{target}</td><td>{streak}</td><td>{flag}</td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm align-items-center"><i class="ti ti-pencil text-white"></i></a></div></td></tr>'
     for emp, month, level, rating, target, streak, flag in [
         ('employee2', 'Jul 2026', 'Level 1', '2.8', '2.5', '0', 'No'),
         ('employee2', 'Jun 2026', 'Level 3', '2.2', '2.0', '0', 'No'),
         ('employee2', 'May 2026', 'Level 2', '3.2', '3.0', '0', 'No'),
         ('employee3', 'Jul 2026', 'Level 1', '1.8', '2.5', '3', '<span class="badge bg-danger">Yes</span>'),
         ('employee3', 'Jun 2026', 'Level 3', '1.5', '2.0', '2', 'Yes'),
         ('employee3', 'May 2026', 'Level 2', '2.8', '3.0', '1', 'No'),
         ('Admin', 'Jul 2026', 'Level 1', '3.5', '2.5', '0', 'No'),
    ]],
    perf_extra
)
with open(os.path.join(desktop, 'performance.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('Created performance.html')

# === 10. HR Targets ===
hrt_extra = '''
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <div class="card bg-light p-3 mb-0">
                                        <h5>IT Profile Targets</h5>
                                        <p class="mb-0"><strong>Threshold:</strong> 5 per month (incentive from 6th)</p>
                                        <p class="mb-0"><strong>Incentive:</strong> Rs 5,000 total per profile</p>
                                        <p class="mb-0">→ Rs 2,500 added to salary</p>
                                        <p class="mb-0">→ Rs 2,500 as e-commerce gift points</p>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card bg-light p-3 mb-0">
                                        <h5>Non-IT Profile Targets</h5>
                                        <p class="mb-0"><strong>Threshold:</strong> 10 per month (incentive from 11th)</p>
                                        <p class="mb-0"><strong>Incentive:</strong> Rs 2,000 per profile</p>
                                        <p class="mb-0">→ Rs 1,000 added to salary</p>
                                        <p class="mb-0">→ Rs 1,000 as e-commerce gift points</p>
                                    </div>
                                </div>
                            </div>'''
html = make_page(
    'HR Targets',
    'HR Admin / HR Targets',
    'HR Targets & Incentives',
    ['Year', 'Month', 'Target Type', 'Target', 'Achieved', 'Incentive Eligible', 'Salary Incentive', 'Gift Points'],
    [f'<tr><td>{yr}</td><td>{mon}</td><td>{ttype}</td><td>{targ}</td><td>{ach}</td><td>{elig}</td><td>{sal}</td><td>{gift}</td></tr>'
     for yr, mon, ttype, targ, ach, elig, sal, gift in [
         ('2026', 'July', 'IT', '5', '7', '2 profiles', 'Rs 5,000', 'Rs 5,000'),
         ('2026', 'July', 'Non-IT', '10', '12', '2 profiles', 'Rs 2,000', 'Rs 2,000'),
         ('2026', 'June', 'IT', '5', '4', '0 profiles', 'Rs 0', 'Rs 0'),
         ('2026', 'June', 'Non-IT', '10', '15', '5 profiles', 'Rs 5,000', 'Rs 5,000'),
         ('2026', 'May', 'IT', '5', '8', '3 profiles', 'Rs 7,500', 'Rs 7,500'),
         ('2026', 'May', 'Non-IT', '10', '11', '1 profile', 'Rs 1,000', 'Rs 1,000'),
    ]],
    hrt_extra
)
with open(os.path.join(desktop, 'hr-targets.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('Created hr-targets.html')

# === 11. Family Details ===
html = make_page(
    'Family Details',
    'Insurance / Family Details',
    'Family & Nominee Details',
    ['Employee', 'Nominee Name', 'Relationship', 'Policy Number', 'Family Member', 'Relation', 'Date of Birth', 'Action'],
    [f'<tr><td>{emp}</td><td>{nom}</td><td>{rel}</td><td>{pno}</td><td>{fam}</td><td>{frel}</td><td>{dob}</td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm align-items-center"><i class="ti ti-pencil text-white"></i></a></div></td></tr>'
     for emp, nom, rel, pno, fam, frel, dob in [
         ('employee2', 'Mrs. Suryani', 'Spouse', 'POL-2026-001', 'Master A. Suryani', 'Son', 'Jan 15, 2018'),
         ('employee2', '', '', '', 'Mrs. L. Suryani', 'Mother', 'Jun 8, 1965'),
         ('Admin', 'Mr. Admin Sr.', 'Father', 'POL-2026-002', 'Ms. Admin Jr.', 'Daughter', 'Mar 22, 2010'),
         ('employee3', 'Mrs. E3 Spouse', 'Spouse', 'POL-2026-003', 'Master E3 Child', 'Son', 'Sep 12, 2020'),
    ]]
)
with open(os.path.join(desktop, 'family-details.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('Created family-details.html')

# === 12. Assets ===
asset_extra = '''
                            <div class="row mb-3" id="policies">
                                <div class="col-md-12">
                                    <div class="card bg-light p-3 mb-0">
                                        <h5>Asset Policies</h5>
                                        <table class="table table-bordered mb-0">
                                            <thead><tr><th>Policy Area</th><th>Key Rule</th></tr></thead>
                                            <tbody>
                                                <tr><td>Lost ID Card</td><td>Notify HR -> Written incident report -> Deactivate -> Replace after approval</td></tr>
                                                <tr><td>Replacement Charge (1st occurrence)</td><td>Rs 500</td></tr>
                                                <tr><td>Replacement Charge (2nd occurrence)</td><td>Rs 700</td></tr>
                                                <tr><td>Repeated Loss</td><td>Subject to HR discretion</td></tr>
                                                <tr><td>Employee Acknowledgement</td><td>Name, Employee ID, Department, Signature, Date countersigned by HR</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>'''
html = make_page(
    'Assets',
    'Assets / Asset List',
    'Asset Management',
    ['Asset ID', 'Employee', 'Asset Type', 'Issue Date', 'Status', 'Condition', 'Replacement Charge', 'Action'],
    [f'<tr><td>{aid}</td><td>{emp}</td><td>{atype}</td><td>{date}</td><td><span class="badge bg-{scolor}">{sstatus}</span></td><td>{cond}</td><td>{charge}</td><td><div class="action-btn bg-info ms-2"><a href="#" class="mx-3 btn btn-sm align-items-center"><i class="ti ti-pencil text-white"></i></a></div></td></tr>'
     for aid, emp, atype, date, sstatus, scolor, cond, charge in [
         ('AST-001', 'employee2', 'ID Card', 'May 27, 2025', 'Issued', 'success', 'Good', '-'),
         ('AST-002', 'employee2', 'Laptop - Dell', 'May 27, 2025', 'Issued', 'success', 'Good', '-'),
         ('AST-003', 'employee2', 'Charger', 'May 27, 2025', 'Issued', 'success', 'Good', '-'),
         ('AST-004', 'Admin', 'ID Card', 'Jan 1, 2025', 'Issued', 'success', 'Good', '-'),
         ('AST-005', 'employee3', 'ID Card', 'Mar 15, 2025', 'Lost', 'danger', '-', 'Rs 500'),
         ('AST-006', 'employee3', 'Laptop - HP', 'Mar 15, 2025', 'Issued', 'success', 'Fair', '-'),
         ('AST-007', 'employee4', 'ID Card', 'Feb 1, 2025', 'Damaged', 'warning', 'Damaged', 'Rs 700'),
         ('AST-008', 'employee4', 'Charger', 'Feb 1, 2025', 'Lost', 'danger', '-', 'Rs 500'),
    ]],
    asset_extra
)
with open(os.path.join(desktop, 'assets.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('Created assets.html')

print('\nAll 12 new pages created!')
