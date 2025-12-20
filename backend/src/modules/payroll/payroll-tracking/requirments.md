Payroll  tracking 					
Phase	

Requirement Names	


1. Employee Self-service	


view and download his/her payslip online	

View status and details of his/her payslips	

View my base salary according to my employment contract (full-time, part-time.)	


Employee Profile (Contract/Job info)	

View compensation for unused leave days		

Leaves (Encashment calculation)	

View transportation or commuting compensation	

View detailed tax deductions (income tax, social contributions, etc.) along with the law or rule applied	

View insurance deductions (health, pension, unemployment, etc.) itemized	

View any salary deductions due to misconduct or unapproved absenteeism (missing days)	

Time Management (Absenteeism records)	

View deductions for unpaid leave day	

Leaves (Unpaid leave status)	

View salary history	

View employer contributions (insurance, pension, allowances)	

Download tax documents	REQ-PY-15	

Dispute payroll errors (like over-deductions or missing bonuses by selecting payslip)	

Submit expense reimbursement claims	

Track the approval and payment status of my claims, disputes	


2. Operational Reports	Payroll specialist generate payroll reports by department	

Organizational Structure (Cost Center/Entity)	

Finance staff generate month-end and year-end payroll summaries	REQ-PY-29	

Finance staff generate reports about taxes, insurance contributions, and benefits,	

3. Disputes and claim approval/ rejection	

Payroll Specialist view , Approve/Reject Disputes 	

Payroll manager confrim on Dispute Approval (Only Approved Disputes will reach him so he can decideto accept or reject,multi-step approval)	

Finance staff get notified with approved Dispute and can view them	

Payroll Specialist view , Approve/Reject Expense claims	

Payroll manager confrim on Expense claims Approval (Only Approved claims will reach him so he can decide to accept or reject,multi-step approval)	

Finance staff get notified with approved Expense claims and can view them	

4. Refund Process	

Finance staff generate refund for Disputes on approval (status: pending until execeuted in payroll cycle)	

Finance staff generate refund for expense claims on approval (status: pending until execeuted in payroll cycle)	


Payroll Tracking, Transparency & Employee Self-Service	
User Story ID	User Story Description
REQ-PY-1	As an Employee, I want to view and download my payslip online so that I can see my monthly salary
REQ-PY-2	As an Employee, I want to see status and details of my payslip (paid, disputed) so that I know exactly where my salary is in the payroll process and can plan accordingly.
REQ-PY-3	As an Employee, I want to see my base salary according to my employment contract (full-time, part-time, temporary, etc.), so that I know my standard monthly earnings.
REQ-PY-5	As an Employee, I want to see compensation for unused or encashed leave days, so that I understand how my remaining leave converts into pay.
REQ-PY-7	As an Employee, I want to see transportation or commuting compensation, so that I know my travel-related costs are covered.
REQ-PY-8	As an Employee, I want to see detailed tax deductions (income tax, social contributions, etc.) along with the law or rule applied, so that I understand how my taxable salary is calculated.
REQ-PY-9	As an Employee, I want to see insurance deductions (health, pension, unemployment, etc.) itemized, so that I know what protections are covered by my contributions.
REQ-PY-10	As an Employee, I want to see any salary deductions due to misconduct or unapproved absenteeism, so that I know why part of my salary was reduced.
REQ-PY-11	As an Employee, I want to see deductions for unpaid leave days, so that I understand how my time off affects my salary.
REQ-PY-13	As an Employee, I want to access my salary history so that I can track payments over time.
REQ-PY-14	As an Employee, I want to view employer contributions (insurance, pension, allowances) so that I know my full benefits.
REQ-PY-15	As an Employee, I want to download tax documents (e.g., annual tax statement) so that I can use them for official purposes.
REQ-PY-16	As an Employee, I want to dispute payroll errors (like over-deductions or missing bonuses), so that they are corrected promptly.
REQ-PY-17	As an Employee, I want to submit expense reimbursement claims, so that I can recover money I spent on business purposes.
REQ-PY-18	As an Employee, I want to track the approval and payment status of my claims and disputes, so that I know when I’ll be reimbursed.
REQ-PY-25	As Finance Staff, I want to generate reports about taxes, insurance contributions, and benefits, so that accounting books are compliant.
REQ-PY-29	As Finance Staff, I want to generate month-end and year-end payroll summaries, so that audits and reporting are simplified.
REQ-PY-38	As a Payroll Specialist, I want to generate payroll reports by department, so that I can analyze salary distribution and ensure budget alignment.
REQ-PY-39	As Payroll specialist , I want to approve/reject Disputes , so that it can be escalated to payroll manager in casse of approval.
REQ-PY-40	As Payroll Manager, I want to confirm approval of Disputes , so that finance staff can be notified.(muti-step approval)
REQ-PY-41	As Finance staff, I want to view and get notified with approved Disputes , so that adjusments can be done.
REQ-PY-42	As Payroll specialist , I want to approve/reject expense claims, so that it can be escalated to payroll manager in casse of approval.
REQ-PY-43	As Payroll Manager, I want to confirm approval of expense claims, so that finance staff can be notified. (muti-step approval)
REQ-PY-44	As Finance staff, I want to view and get notified with approved expense claims, so that adjusments can be done.
REQ-PY-45	As Finance staff I want to generate refund for Disputes on approval so that it will be included in next payroll cycle
REQ-PY-46	As Finance staff, I want to generate refund fo Expense claims on approval so that it will be included in next payroll cycle




BR ID	BR Description

2	The system must calculate base salary according to contract terms and role type.
5	The system must identify the payroll income taxes’ brackets enforced through Local Tax Law.
6	The system must support multiple tax components (e.g. income tax, exemption
11	The system must deduct pay for unpaid leave days based on daily/hourly salary calculations.
17	An auto-generated Payslip should be available through the system with a clear breakdown of components.
23	The system must support issuing reports about standard payroll summary, tax reports, and pay slip history.


"The module must be integrated with other HRMS modules as the: 
● Leaves Module: for cases of unapproved leaves, or for encashment of unused annual leave balance for termination. Such unused leaves must be either carried forward to the next fiscal year (if allowed) or converted into compensation, in line with Egyptian Labor Law 2025. Also, to factor in paid and unpaid leave deductions automatically applied based on leave rules. 
● Time Management: to factor in working days/hours, overtime, and absence data directly. 
● Onboarding, Recruitment & Off boarding Module: for sign on bonuses and severance pay and other related items due in either termination or resignation cases
● Employee Profile Module, to be linked to employee contracts and any related sign-on bonuses included. Any changes in contracts auto-update salary/payroll. "	