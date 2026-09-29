from test_admin_access import ExternalAdminAccessTests
import app

class AppUserTests(ExternalAdminAccessTests):
    def admin_headers(self):
        cookie,csrf=self.login()
        return {'Cookie':cookie,'X-Admin-CSRF':csrf}
    def create(self, role='user', permissions=None):
        payload={'username':'tester','name':'Test account','password':'Strong-test-pass-123',
                 'role':role,'permissions':permissions or {'sizing':'view'}}
        status,user,_=self.request('/admin/api/users',payload,'POST',self.admin_headers())
        self.assertEqual(status,201,user)
        return user
    def account_headers(self):
        status,_,headers=self.request('/admin/api/login',{'username':'tester','password':'Strong-test-pass-123'},'POST')
        self.assertEqual(status,200)
        pairs=[s.split(';',1)[0] for s in headers.get_all('Set-Cookie')]
        csrf=next(s.split('=',1)[1] for s in pairs if s.startswith('hvac_admin_csrf='))
        return {'Cookie':'; '.join(pairs),'X-Admin-CSRF':csrf}
    def test_read_permissions_enforced_by_server(self):
        self.create();headers=self.account_headers()
        self.assertEqual(self.request('/admin/api/projects',headers=headers)[0],200)
        for path in ['/admin/api/cylinders','/admin/api/operators','/admin/api/users','/admin/api/%75sers']:
            self.assertEqual(self.request(path,headers=headers)[0],403,path)
        self.assertEqual(self.request('/admin/api/projects',{'project_name':'forbidden'},'POST',headers)[0],403)
        self.assertEqual(self.request('/admin/api/users',{'role':'admin'},'POST',headers)[0],403)
        status,me,_=self.request('/admin/api/me',headers=headers)
        self.assertEqual(status,200);self.assertEqual(me['role'],'user')
        self.assertNotIn('password_hash',str(me))
    def test_change_permissions_and_disable_revoke_session(self):
        user=self.create();headers=self.account_headers()
        admin=self.admin_headers()
        status,_,_=self.request('/admin/api/users/'+user['id'],{'permissions':{'cylinders':'view'}},'PUT',admin)
        self.assertEqual(status,200)
        self.assertEqual(self.request('/admin/api/projects',headers=headers)[0],401)
        headers=self.account_headers()
        self.assertEqual(self.request('/admin/api/projects',headers=headers)[0],403)
        self.assertEqual(self.request('/admin/api/cylinders',headers=headers)[0],200)
        self.request('/admin/api/users/'+user['id'],{'active':False},'PUT',admin)
        self.assertEqual(self.request('/admin/api/cylinders',headers=headers)[0],401)
        self.assertEqual(self.request('/admin/api/login',{'username':'tester','password':'Strong-test-pass-123'},'POST')[0],403)
    def test_user_write_and_csrf(self):
        self.create(permissions={'sizing':'edit','cylinders':'edit'})
        headers=self.account_headers()
        self.assertEqual(self.request('/admin/api/projects',{'project_name':'Allowed'},'POST',headers)[0],201)
        self.assertEqual(self.request('/admin/api/projects',{},'POST',{'Cookie':headers['Cookie']})[0],403)
        self.assertEqual(self.request('/admin/api/cylinders/test','', 'DELETE',headers)[0],403)
        cylinder={'name':'Test','code':'USER-1','refrigerant':'R32','tare_kg':4,'current_gas_kg':2}
        status,row,_=self.request('/admin/api/cylinders',cylinder,'POST',headers)
        self.assertEqual(status,201)
        status,movement,_=self.request('/admin/api/cylinders/'+row['id']+'/transactions',{'operation':'remove','amount_kg':.1},'POST',headers)
        self.assertEqual(status,201,movement)
        _,detail,_=self.request('/admin/api/cylinders/'+row['id'],headers=headers)
        self.assertTrue(any(item['operator_name']=='Test account' for item in detail['history']))
    def test_admin_and_last_admin_guard(self):
        user=self.create(role='admin');headers=self.account_headers()
        self.assertEqual(self.request('/admin/api/users',headers=headers)[0],200)
        self.assertEqual(self.request('/admin/api/users/'+user['id'],{'role':'user'},'PUT',headers)[0],400)
        with app.db_connection() as db:
            row=db.execute('SELECT * FROM app_users WHERE id=?',(user['id'],)).fetchone()
        self.assertNotEqual(row['password_hash'],'Strong-test-pass-123')
        status,public,_=self.request('/admin/api/users',headers=headers)
        self.assertNotIn('password_hash',str(public))
        self.assertEqual(self.request('/admin/api/users',{'username':'tester','password':'Strong-test-pass-123'},'POST',headers)[0],400)
    def test_password_reset_invalidates_old_cookie(self):
        user=self.create();headers=self.account_headers()
        self.request('/admin/api/users/'+user['id'],{'password':'New-strong-pass-123'},'PUT',self.admin_headers())
        self.assertEqual(self.request('/admin/api/me',headers=headers)[0],401)
        self.assertEqual(self.request('/admin/api/login',{'username':'tester','password':'Strong-test-pass-123'},'POST')[0],403)
        self.assertEqual(self.request('/admin/api/login',{'username':'tester','password':'New-strong-pass-123'},'POST')[0],200)
