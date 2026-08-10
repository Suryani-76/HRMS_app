import os, re

desktop = os.getcwd()

# New expanded sidebar HTML
sidebar_html = '''                    <li class="dash-item"><a href="dashboard_replica.html" class="dash-link"><span class="dash-micon"><i class="ti ti-home"></i></span><span class="dash-mtext">Dashboard</span></a></li>
                    <li class="dash-item dash-hasmenu">
                        <a href="#" class="dash-link" onclick="toggleSubmenu(this)"><span class="dash-micon"><i class="ti ti-license"></i></span><span class="dash-mtext">Recruitment</span><span class="dash-arrow"><i class="ti ti-chevron-right"></i></span></a>
                        <ul class="dash-submenu">
                            <li class="dash-item"><a class="dash-link" href="job-postings.html">Job Postings</a></li>
                            <li class="dash-item"><a class="dash-link" href="candidates.html">Candidates</a></li>
                            <li class="dash-item"><a class="dash-link" href="interview-rounds.html">Interview Rounds</a></li>
                            <li class="dash-item"><a class="dash-link" href="offers.html">Offers</a></li>
                            <li class="dash-item"><a class="dash-link" href="onboarding.html">Onboarding</a></li>
                            <li class="dash-item"><a class="dash-link" href="career-management.html">Career Management</a></li>
                        </ul>
                    </li>
                    <li class="dash-item"><a href="employee.html" class="dash-link"><span class="dash-micon"><i class="ti ti-user"></i></span><span class="dash-mtext">Employee</span></a></li>
                    <li class="dash-item"><a href="bank-details.html" class="dash-link"><span class="dash-micon"><i class="ti ti-building-bank"></i></span><span class="dash-mtext">Bank Details</span></a></li>
                    <li class="dash-item dash-hasmenu">
                        <a href="#" class="dash-link" onclick="toggleSubmenu(this)"><span class="dash-micon"><i class="ti ti-clock"></i></span><span class="dash-mtext">Attendance</span><span class="dash-arrow"><i class="ti ti-chevron-right"></i></span></a>
                        <ul class="dash-submenu">
                            <li class="dash-item"><a class="dash-link" href="attendanceemployee.html">Mark Attendance</a></li>
                            <li class="dash-item"><a class="dash-link" href="attendance-log.html">Attendance Log</a></li>
                            <li class="dash-item"><a class="dash-link" href="deduction-rules.html">Deduction Rules</a></li>
                        </ul>
                    </li>
                    <li class="dash-item dash-hasmenu">
                        <a href="#" class="dash-link" onclick="toggleSubmenu(this)"><span class="dash-micon"><i class="ti ti-receipt"></i></span><span class="dash-mtext">Payroll</span><span class="dash-arrow"><i class="ti ti-chevron-right"></i></span></a>
                        <ul class="dash-submenu">
                            <li class="dash-item"><a class="dash-link" href="payslip.html">Payslip</a></li>
                            <li class="dash-item"><a class="dash-link" href="monthly-payout.html">Monthly Payout</a></li>
                        </ul>
                    </li>
                    <li class="dash-item dash-hasmenu">
                        <a href="#" class="dash-link" onclick="toggleSubmenu(this)"><span class="dash-micon"><i class="ti ti-star"></i></span><span class="dash-mtext">Performance</span><span class="dash-arrow"><i class="ti ti-chevron-right"></i></span></a>
                        <ul class="dash-submenu">
                            <li class="dash-item"><a class="dash-link" href="performance.html">Monthly Ratings</a></li>
                            <li class="dash-item"><a class="dash-link" href="performance.html#cycles">Review Cycles</a></li>
                        </ul>
                    </li>
                    <li class="dash-item dash-hasmenu">
                        <a href="#" class="dash-link" onclick="toggleSubmenu(this)"><span class="dash-micon"><i class="ti ti-user-plus"></i></span><span class="dash-mtext">HR Admin</span><span class="dash-arrow"><i class="ti ti-chevron-right"></i></span></a>
                        <ul class="dash-submenu">
                            <li class="dash-item"><a class="dash-link" href="hr-targets.html">HR Targets</a></li>
                            <li class="dash-item"><a class="dash-link" href="award.html">Award</a></li>
                            <li class="dash-item"><a class="dash-link" href="resignation.html">Resignation</a></li>
                            <li class="dash-item"><a class="dash-link" href="travel.html">Trip</a></li>
                            <li class="dash-item"><a class="dash-link" href="promotion.html">Promotion</a></li>
                            <li class="dash-item"><a class="dash-link" href="complaint.html">Complaints</a></li>
                            <li class="dash-item"><a class="dash-link" href="warning.html">Warning</a></li>
                            <li class="dash-item"><a class="dash-link" href="termination.html">Termination</a></li>
                            <li class="dash-item"><a class="dash-link" href="announcement.html">Announcement</a></li>
                            <li class="dash-item"><a class="dash-link" href="holiday.html">Holidays</a></li>
                        </ul>
                    </li>
                    <li class="dash-item dash-hasmenu">
                        <a href="#" class="dash-link" onclick="toggleSubmenu(this)"><span class="dash-micon"><i class="ti ti-shield"></i></span><span class="dash-mtext">Insurance</span><span class="dash-arrow"><i class="ti ti-chevron-right"></i></span></a>
                        <ul class="dash-submenu">
                            <li class="dash-item"><a class="dash-link" href="nominees.html">Insurance Details</a></li>
                            <li class="dash-item"><a class="dash-link" href="family-details.html">Family Details</a></li>
                        </ul>
                    </li>
                    <li class="dash-item dash-hasmenu">
                        <a href="#" class="dash-link" onclick="toggleSubmenu(this)"><span class="dash-micon"><i class="ti ti-device-floppy"></i></span><span class="dash-mtext">Assets</span><span class="dash-arrow"><i class="ti ti-chevron-right"></i></span></a>
                        <ul class="dash-submenu">
                            <li class="dash-item"><a class="dash-link" href="assets.html">Asset List</a></li>
                            <li class="dash-item"><a class="dash-link" href="assets.html#policies">Policies</a></li>
                        </ul>
                    </li>
                    <li class="dash-item"><a href="contract.html" class="dash-link"><span class="dash-micon"><i class="ti ti-file-text"></i></span><span class="dash-mtext">Contracts</span></a></li>
                    <li class="dash-item"><a href="ticket.html" class="dash-link"><span class="dash-micon"><i class="ti ti-ticket"></i></span><span class="dash-mtext">Ticket</span></a></li>
                    <li class="dash-item"><a href="event.html" class="dash-link"><span class="dash-micon"><i class="ti ti-calendar-event"></i></span><span class="dash-mtext">Event</span></a></li>
                    <li class="dash-item"><a href="meeting.html" class="dash-link"><span class="dash-micon"><i class="ti ti-calendar-time"></i></span><span class="dash-mtext">Meeting</span></a></li>
                    <li class="dash-item"><a href="document-upload.html" class="dash-link"><span class="dash-micon"><i class="ti ti-file"></i></span><span class="dash-mtext">Document</span></a></li>
                    <li class="dash-item"><a href="task.html" class="dash-link"><span class="dash-micon"><i class="ti ti-checklist"></i></span><span class="dash-mtext">Tasks</span></a></li>'''

# Read template from dashboard_replica.html
with open(os.path.join(desktop, 'dashboard_replica.html'), 'r', encoding='utf-8') as f:
    template = f.read()

# Find old sidebar and replace
old_sidebar_pattern = r'<li class="dash-item"><a href="employee\.html".*?</li>\s*</ul>\s*</div>\s*</div>\s*</nav>'
# Actually let's find a more reliable pattern

# The sidebar is between <ul class="dash-navbar"> and </ul></div></div></nav>
start_marker = '<ul class="dash-navbar">'
end_marker = '</ul>\n\n</div>\n</div>\n</nav>'

start_idx = template.find(start_marker)
end_idx = template.find('</ul>', start_idx)
end_idx = template.find('</nav>', end_idx)

old_sidebar = template[start_idx:end_idx]

# Get the leading whitespace from the original sidebar
lines = old_sidebar.split('\n')
first_line = lines[0] if lines else ''
indent = first_line[:len(first_line) - len(first_line.lstrip())]

# Format sidebar with proper indentation
sidebar_lines = sidebar_html.split('\n')
formatted_sidebar = '\n'.join(indent + line if line.strip() else line for line in sidebar_lines)

# Replace in template
new_template = template[:start_idx] + '<ul class="dash-navbar">\n' + formatted_sidebar + '\n' + template[end_idx:]

with open(os.path.join(desktop, 'dashboard_replica.html'), 'w', encoding='utf-8') as f:
    f.write(new_template)

print('Updated dashboard_replica.html sidebar')

# Now update sidebar in all generated HTML files
# These files have a consistent sidebar pattern between <ul class="dash-navbar"> and </ul></div></div></nav>
for fname in os.listdir(desktop):
    if not fname.endswith('.html') or fname == 'login.html' or fname == 'dashboard_replica.html':
        continue
    fpath = os.path.join(desktop, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    s_start = content.find('<ul class="dash-navbar">')
    s_end = content.find('</nav>', s_start)
    if s_start == -1 or s_end == -1:
        print(f'Skipped {fname}: no sidebar found')
        continue
    
    # Find the old sidebar content
    old_side = content[s_start:s_end]
    
    # Build new sidebar with matching indentation
    first_line = old_side.split('\n')[0]
    indent = first_line[:len(first_line) - len(first_line.lstrip())]
    sidebar_lines2 = sidebar_html.split('\n')
    formatted_side2 = '\n'.join(indent + line if line.strip() else line for line in sidebar_lines2)
    
    new_content = content[:s_start] + '<ul class="dash-navbar">\n' + formatted_side2 + '\n' + content[s_end:]
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'Updated {fname} sidebar')

print('\nSidebar updated in all files!')
